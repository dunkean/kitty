'use strict';

const path = require('path');
const url = require('url');
const settings = require('../../lib/settings');
const mongo = require('../../lib/mongo');
const utils = require('../../lib/utils');
const parse = require('../../lib/parse');
const SettingsService = require('../settings/settings');
const ObjectID = require('mongodb').ObjectID;
const formidable = require('formidable');
const fse = require('fs-extra');

class StoreImagesService {
  constructor() {}

  getErrorMessage(err) {
    return { 'error': true, 'message': err.toString() };
  }

  getImages(storeId) {
    if(!ObjectID.isValid(storeId)) {
      return Promise.reject('Invalid identifier');
    }
    let storeObjectID = new ObjectID(storeId);

    return SettingsService.getSettings().then(generalSettings =>
      mongo.db.collection('stores').findOne({ _id: storeObjectID }, {fields: {images: 1}}).then(store => {
        if(store && store.images && store.images.length > 0) {
          let images = store.images.map(image => {
            image.url = url.resolve(generalSettings.domain, settings.storesUploadUrl + '/' + store._id + '/' + image.filename);
            return image;
          })

          images = images.sort((a,b) => (a.position - b.position ));
          return images;
        } else {
          return []
        }
      })
    )
  }

  deleteImage(storeId, imageId) {
    if(!ObjectID.isValid(storeId) || !ObjectID.isValid(imageId)) {
      return Promise.reject('Invalid identifier');
    }
    let storeObjectID = new ObjectID(storeId);
    let imageObjectID = new ObjectID(imageId);

    return this.getImages(storeId)
    .then(images => {
      if(images && images.length > 0) {
        let imageData = images.find(i => i.id.toString() === imageId.toString());
        if(imageData) {
          let filename = imageData.filename;
          let filepath = path.resolve(settings.storesUploadPath + '/' + storeId + '/' + filename);
          fse.removeSync(filepath);
          return mongo.db.collection('stores').updateOne({ _id: storeObjectID }, { $pull: { images: { id: imageObjectID } } })
        } else {
          return true;
        }
      } else {
        return true;
      }
    })
    .then(() => true);
  }

  async addImage(req, res) {
    const storeId = req.params.storeId;
    if(!ObjectID.isValid(storeId)) {
      res.status(500).send(this.getErrorMessage('Invalid identifier'));
      return;
    }

    let uploadedFiles = [];
    const storeObjectID = new ObjectID(storeId);
    const uploadDir = path.resolve(settings.storesUploadPath + '/' + storeId);
    fse.ensureDirSync(uploadDir);

    let form = new formidable.IncomingForm();
    form.uploadDir = uploadDir;

    form
      .on('fileBegin', (name, file) => {
        // Emitted whenever a field / value pair has been received.
        file.name = utils.getCorrectFileName(file.name);
        file.path = uploadDir + '/' + file.name;
      })
      .on('file', async (field, file) => {
        // every time a file has been uploaded successfully,
        if(file.name) {
          const imageData = {
            "id": new ObjectID(),
            "alt": "",
            "position": 99,
            "filename": file.name
          };

          uploadedFiles.push(imageData);

          await mongo.db.collection('stores').updateOne({
            _id: storeObjectID
          }, {
            $push: { images: imageData }
          });
        }
      })
      .on('error', (err) => {
        res.status(500).send(this.getErrorMessage(err));
      })
      .on('end', () => {
        res.send(uploadedFiles);
      });

    form.parse(req);
  }

  updateImage(storeId, imageId, data) {
    if(!ObjectID.isValid(storeId) || !ObjectID.isValid(imageId)) {
      return Promise.reject('Invalid identifier');
    }
    let storeObjectID = new ObjectID(storeId);
    let imageObjectID = new ObjectID(imageId);

    const imageData = this.getValidDocumentForUpdate(data);

    return mongo.db.collection('stores').updateOne({
      _id: storeObjectID,
      'images.id': imageObjectID
    }, {$set: imageData});
  }

  getValidDocumentForUpdate(data) {
    if (Object.keys(data).length === 0) {
      return new Error('Required fields are missing');
    }

    let image = {};

    if (data.alt !== undefined) {
      image['images.$.alt'] = parse.getString(data.alt);
    }

    if (data.position !== undefined) {
      image['images.$.position'] = parse.getNumberIfPositive(data.position) || 0;
    }

    return image;
  }
}

module.exports = new StoreImagesService();
