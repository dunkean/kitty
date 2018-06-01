'use strict';

const path = require('path');
const url = require('url');
const formidable = require('formidable');
const fse = require('fs-extra');
const ObjectID = require('mongodb').ObjectID;
const settings = require('../../lib/settings');
const SettingsService = require('../settings/settings');
const mongo = require('../../lib/mongo');
const utils = require('../../lib/utils');
const parse = require('../../lib/parse');


/*
this.router.get('/v1/stores', security.checkUserScope.bind(this, security.scope.READ_STORES), this.getStores.bind(this));
this.router.post('/v1/stores', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.addStore.bind(this));
this.router.get('/v1/stores/:id', security.checkUserScope.bind(this, security.scope.READ_STORES), this.getSingleStore.bind(this));
this.router.put('/v1/stores/:id', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.updateStore.bind(this));
this.router.delete('/v1/stores/:id', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.deleteStore.bind(this));
this.router.post('/v1/stores/:id/image', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.uploadStoreImage.bind(this));
this.router.delete('/v1/stores/:id/image', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.deleteStoreImage.bind(this));
*/
/*{
    "_id" : ObjectId("5b082aaf455fe936f1aac16c"),
    "date_created" : ISODate("2018-05-25T15:24:31.151Z"),
    "date_updated" : null,
    "name" : "Chien",
    "description" : "Description of the store Chien which is a store !",
    "meta_description" : "The store Chien deals with Chien stuff.",
    "meta_title" : "Chien",
    "enabled" : true,
    "position": number,
    "slug" : "chien"
    "image" : "",
    "position" : 1165,
    site_url
    product_count
}*/

class StoresService {
  constructor() {}

  getFilter(params = {}) {
    let filter = {};
    const enabled = parse.getBooleanIfValid(params.enabled);
    if (enabled !== null) {
      filter.enabled = enabled;
    }
    const id = parse.getObjectIDIfValid(params.id);
    if (id) {
      filter._id = id;
    }
    return filter;
  }

  async getStores(params = {}) {
    const filter = this.getFilter(params);
    const projection = utils.getProjectionFromFields(params.fields);
    const generalSettings = await SettingsService.getSettings();
    const domain = generalSettings.domain;
    const items = await mongo.db.collection('stores').find(filter, { projection: projection }).sort({position: 1}).toArray();
    const result = items.map(store => this.changeProperties(store, domain));
    return result;
  }

  getSingleStore(id) {
    if (!ObjectID.isValid(id)) {
      return Promise.reject('Invalid identifier');
    }
    return this.getStores({id: id}).then(stores => {
      return stores.length > 0
        ? stores[0]
        : null;
    })
  }

  async addStore(data) {
    const lastStore = await mongo.db.collection('stores').findOne({}, { sort: {position: -1} });
    const newPosition = (lastStore && lastStore.position > 0) ? lastStore.position + 1 : 1;
    const dataToInsert = await this.getValidDocumentForInsert(data, newPosition);
    const insertResult = await mongo.db.collection('stores').insertMany([dataToInsert]);
    return this.getSingleStore(insertResult.ops[0]._id.toString());
  }

  updateStore(id, data) {
    if(!ObjectID.isValid(id)) {
      return Promise.reject('Invalid identifier');
    }
    let storeObjectID = new ObjectID(id);

    return this.getValidDocumentForUpdate(id, data)
      .then(dataToSet => mongo.db.collection('stores').updateOne({ _id: storeObjectID }, {$set: dataToSet}))
      .then(res => res.modifiedCount > 0 ? this.getSingleStore(id) : null)
  }

  async deleteStore(storeId) {
    if (!ObjectID.isValid(storeId)) {
      return Promise.reject('Invalid identifier');
    }
    const storeObjectID = new ObjectID(storeId);
    const store = await this.getSingleCustomer(storeId);
    const deleteResponse = await mongo.db.collection('customers').deleteOne({'_id': storeObjectID});
    //// TODO: delete all prices for this store
    return deleteResponse.deletedCount > 0;
  }

  getErrorMessage(err) {
    return { 'error': true, 'message': err.toString() };
  }

  getValidDocumentForInsert(data, newPosition) {
      //  Allow empty store to create draft

      let store = {
        'date_created': new Date(),
        'date_updated': null,
        'image': ''
      };

      store.name = parse.getString(data.name);
      store.description = parse.getString(data.description);
      store.meta_description = parse.getString(data.meta_description);
      store.meta_title = parse.getString(data.meta_title);
      store.enabled = parse.getBooleanIfValid(data.enabled, true);
      store.sort = parse.getString(data.sort);
      store.parent_id = parse.getObjectIDIfValid(data.parent_id);
      store.position = parse.getNumberIfValid(data.position) || newPosition;
      store.site_url = parse.getUrlIfValid(data.site_url);
      let slug = (!data.slug || data.slug.length === 0) ? data.name : data.slug;
      if(!slug || slug.length === 0) {
        return Promise.resolve(store);
      } else {
        return utils.getAvailableSlug(slug).then(newSlug => {
          store.slug = newSlug;
          return store;
        });
      }
  }


  getValidDocumentForUpdate(id, data) {
    return new Promise((resolve, reject) => {
      if(!ObjectID.isValid(id)) {
        reject('Invalid identifier');
      }
      if (Object.keys(data).length === 0) {
        reject('Required fields are missing');
      }

      let store = {
        'date_updated': new Date()
      };

      if(data.name !== undefined) {
        store.name = parse.getString(data.name);
      }

      if(data.description !== undefined) {
        store.description = parse.getString(data.description);
      }

      if(data.meta_description !== undefined) {
        store.meta_description = parse.getString(data.meta_description);
      }

      if(data.meta_title !== undefined) {
        store.meta_title = parse.getString(data.meta_title);
      }

      if(data.site_url !== undefined) {
        store.site_url = parse.getUrlIfValid(data.site_url);
      }

      if(data.enabled !== undefined) {
        store.enabled = parse.getBooleanIfValid(data.enabled, true);
      }

      if(data.image !== undefined) {
        store.image = data.image;
      }

      if(data.position >= 0) {
        store.position = data.position;
      }

      if(data.sort !== undefined) {
        store.sort = data.sort;
      }

      if(data.slug !== undefined){
        let slug = data.slug;
        if(!slug || slug.length === 0) {
          slug = data.name;
        }

        utils.getAvailableSlug(slug, id)
        .then((newSlug) => {
          store.slug = newSlug;
          resolve(store);
        })
        .catch((err) => {
          reject(err);
        });

      } else {
        resolve(store);
      }
    });
  }

  changeProperties(item, domain) {
    if(item) {
      item.id = item._id.toString();
      item._id = undefined;

      if(item.parent_id) {
        item.parent_id = item.parent_id.toString();
      }

      if(item.slug) {
        item.url = url.resolve(domain, item.slug || '');
        item.path = url.resolve('/', item.slug || '');
      }

      if(item.image) {
        item.image = url.resolve(domain, settings.storesUploadUrl + '/' + item.id + '/' + item.image);
      }
    }

    return item;
  }

  deleteStoreImage(id) {
    let dir = path.resolve(settings.storesUploadPath + '/' + id);
    fse.emptyDirSync(dir);
    this.updateStore(id, { 'image': '' });
  }

  uploadStoreImage(req, res) {
    let storeId = req.params.id;
    let form = new formidable.IncomingForm(),
        file_name = null,
        file_size = 0;

    form
      .on('fileBegin', (name, file) => {
        // Emitted whenever a field / value pair has been received.
        let dir = path.resolve(settings.storesUploadPath + '/' + storeId);
        fse.emptyDirSync(dir);
        file.name = utils.getCorrectFileName(file.name);
        file.path = dir + '/' + file.name;
      })
      .on('file', function(field, file) {
        // every time a file has been uploaded successfully,
        file_name = file.name;
        file_size = file.size;
      })
      .on('error', (err) => {
        res.status(500).send(this.getErrorMessage(err));
      })
      .on('end', () => {
        //Emitted when the entire request has been received, and all contained files have finished flushing to disk.
        if(file_name) {
          this.updateStore(storeId, { 'image': file_name });
          res.send({ 'file': file_name, 'size': file_size });
        } else {
          res.status(400).send(this.getErrorMessage('Required fields are missing'));
        }
      });

    form.parse(req);
  }

}

module.exports = new StoresService();
