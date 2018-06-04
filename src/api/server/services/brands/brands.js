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
this.router.get('/v1/brands', security.checkUserScope.bind(this, security.scope.READ_BRANDS), this.getBrands.bind(this));
this.router.post('/v1/brands', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.addBrand.bind(this));
this.router.get('/v1/brands/:id', security.checkUserScope.bind(this, security.scope.READ_BRANDS), this.getSingleBrand.bind(this));
this.router.put('/v1/brands/:id', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.updateBrand.bind(this));
this.router.delete('/v1/brands/:id', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.deleteBrand.bind(this));
this.router.post('/v1/brands/:id/image', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.uploadBrandImage.bind(this));
this.router.delete('/v1/brands/:id/image', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.deleteBrandImage.bind(this));
*/
/*{
    "_id" : ObjectId("5b082aaf455fe936f1aac16c"),
    "date_created" : ISODate("2018-05-25T15:24:31.151Z"),
    "date_updated" : null,
    "name" : "Chien",
    "description" : "Description of the brand Chien which is a brand !",
    "meta_description" : "The brand Chien deals with Chien stuff.",
    "meta_title" : "Chien",
    "enabled" : true,
    "position": number,
    "slug" : "chien"
    "image" : "",
    "position" : 1165,
    site_url
    product_count
}*/

class BrandsService {
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

  async getBrands(params = {}) {
    const filter = this.getFilter(params);
    const projection = utils.getProjectionFromFields(params.fields);
    const generalSettings = await SettingsService.getSettings();
    const domain = generalSettings.domain;
    const items = await mongo.db.collection('brands').find(filter, { projection: projection }).sort({position: 1}).toArray();
    const result = items.map(brand => this.changeProperties(brand, domain));
    return result;
  }

  getSingleBrand(id) {
    if (!ObjectID.isValid(id)) {
      return Promise.reject('Invalid identifier');
    }
    return this.getBrands({id: id}).then(brands => {
      return brands.length > 0
        ? brands[0]
        : null;
    })
  }

  async addBrand(data) {
    const lastBrand = await mongo.db.collection('brands').findOne({}, { sort: {position: -1} });
    const newPosition = (lastBrand && lastBrand.position > 0) ? lastBrand.position + 1 : 1;
    const dataToInsert = await this.getValidDocumentForInsert(data, newPosition);
    const insertResult = await mongo.db.collection('brands').insertMany([dataToInsert]);
    return this.getSingleBrand(insertResult.ops[0]._id.toString());
  }

  updateBrand(id, data) {
    if(!ObjectID.isValid(id)) {
      return Promise.reject('Invalid identifier');
    }
    let brandObjectID = new ObjectID(id);

    return this.getValidDocumentForUpdate(id, data)
      .then(dataToSet => mongo.db.collection('brands').updateOne({ _id: brandObjectID }, {$set: dataToSet}))
      .then(res => res.modifiedCount > 0 ? this.getSingleBrand(id) : null)
  }

  async deleteBrand(brandId) {
    if (!ObjectID.isValid(brandId)) {
      return Promise.reject('Invalid identifier');
    }
    const brandObjectID = new ObjectID(brandId);
    const brand = await this.getSingleBrand(brandId);
    const deleteResponse = await mongo.db.collection('brands').deleteOne({'_id': brandObjectID});
    await mongo.db.collection('products').updateMany({ brand_id: brandId}, { $set: { brand_id: null }});
    if(deleteResponse.deletedCount > 0) {
      let deleteDir = path.resolve(settings.brandsUploadPath + '/' + brandId);
      fse.remove(deleteDir, err => {});
    }
    return deleteResponse.deletedCount > 0;
  }

  getErrorMessage(err) {
    return { 'error': true, 'message': err.toString() };
  }

  getValidDocumentForInsert(data, newPosition) {
      //  Allow empty brand to create draft
      let brand = {
        'date_created': new Date(),
        'date_updated': null,
        'image': ''
      };

      brand.name = parse.getString(data.name);
      brand.description = parse.getString(data.description);
      brand.meta_description = parse.getString(data.meta_description);
      brand.meta_title = parse.getString(data.meta_title);
      brand.enabled = parse.getBooleanIfValid(data.enabled, true);
      brand.sort = parse.getString(data.sort);
      brand.position = parse.getNumberIfValid(data.position) || newPosition;
      brand.site_url = parse.getUrlIfValid(data.site_url);
      let slug = (!data.slug || data.slug.length === 0) ? data.name : data.slug;
      if(!slug || slug.length === 0) {
        return Promise.resolve(brand);
      } else {
        return utils.getAvailableSlug(slug).then(newSlug => {
          brand.slug = newSlug;
          return brand;
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

      let brand = {
        'date_updated': new Date()
      };

      if(data.name !== undefined) {
        brand.name = parse.getString(data.name);
      }

      if(data.description !== undefined) {
        brand.description = parse.getString(data.description);
      }

      if(data.meta_description !== undefined) {
        brand.meta_description = parse.getString(data.meta_description);
      }

      if(data.meta_title !== undefined) {
        brand.meta_title = parse.getString(data.meta_title);
      }

      if(data.site_url !== undefined) {
        brand.site_url = parse.getUrlIfValid(data.site_url);
      }

      if(data.enabled !== undefined) {
        brand.enabled = parse.getBooleanIfValid(data.enabled, true);
      }

      if(data.image !== undefined) {
        brand.image = data.image;
      }

      if(data.position >= 0) {
        brand.position = data.position;
      }

      if(data.sort !== undefined) {
        brand.sort = data.sort;
      }

      if(data.slug !== undefined){
        let slug = data.slug;
        if(!slug || slug.length === 0) {
          slug = data.name;
        }

        utils.getAvailableSlug(slug, id)
        .then((newSlug) => {
          brand.slug = newSlug;
          resolve(brand);
        })
        .catch((err) => {
          reject(err);
        });

      } else {
        resolve(brand);
      }
    });
  }

  changeProperties(item, domain) {
    if(item) {
      item.id = item._id.toString();
      item._id = undefined;

      if(item.slug) {
        item.url = url.resolve(domain, item.slug || '');
        item.path = url.resolve('/', item.slug || '');
      }

      if(item.image) {
        item.image = url.resolve(domain, settings.brandsUploadUrl + '/' + item.id + '/' + item.image);
      }
    }

    return item;
  }

  deleteBrandImage(id) {
    let dir = path.resolve(settings.brandsUploadPath + '/' + id);
    fse.emptyDirSync(dir);
    this.updateBrand(id, { 'image': '' });
  }

  uploadBrandImage(req, res) {
    let brandId = req.params.id;
    let form = new formidable.IncomingForm(),
        file_name = null,
        file_size = 0;

    form
      .on('fileBegin', (name, file) => {
        // Emitted whenever a field / value pair has been received.
        let dir = path.resolve(settings.brandsUploadPath + '/' + brandId);
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
          this.updateBrand(brandId, { 'image': file_name });
          res.send({ 'file': file_name, 'size': file_size });
        } else {
          res.status(400).send(this.getErrorMessage('Required fields are missing'));
        }
      });

    form.parse(req);
  }

}

module.exports = new BrandsService();
