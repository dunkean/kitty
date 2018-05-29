'use strict';

const security = require('../lib/security');
const StoresService = require('../services/stores/stores');
const StoreImagesService = require('../services/stores/images');

class StoresRoute {
  constructor(router) {
    this.router = router;
    this.registerRoutes();
  }

  registerRoutes() {
    this.router.get('/v1/stores', security.checkUserScope.bind(this, security.scope.READ_STORES), this.getStores.bind(this));
    this.router.post('/v1/stores', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.addStore.bind(this));
    this.router.get('/v1/stores/:storeId', security.checkUserScope.bind(this, security.scope.READ_STORES), this.getSingleStore.bind(this));
    this.router.put('/v1/stores/:storeId', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.updateStore.bind(this));
    this.router.delete('/v1/stores/:storeId', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.deleteStore.bind(this));

    this.router.get('/v1/stores/:storeId/images', security.checkUserScope.bind(this, security.scope.READ_STORES), this.getImages.bind(this));
    this.router.post('/v1/stores/:storeId/images', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.addImage.bind(this));
    this.router.put('/v1/stores/:storeId/images/:imageId', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.updateImage.bind(this));
    this.router.delete('/v1/stores/:storeId/images/:imageId', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.deleteImage.bind(this));

    this.router.get('/v1/stores/:storeId/slug', security.checkUserScope.bind(this, security.scope.READ_STORES), this.isSlugExists.bind(this));
  }

  getStores(req, res, next) {
    StoresService.getStores(req.query).then(data => {
      res.send(data)
    }).catch(next);
  }

  getSingleStore(req, res, next) {
    StoresService.getSingleStore(req.params.storeId).then(data => {
      if (data) {
        res.send(data)
      } else {
        res.status(404).end()
      }
    }).catch(next);
  }

  addStore(req, res, next) {
    StoresService.addStore(req.body).then(data => {
      res.send(data)
    }).catch(next);
  }

  updateStore(req, res, next) {
    StoresService.updateStore(req.params.storeId, req.body).then(data => {
      if (data) {
        res.send(data)
      } else {
        res.status(404).end()
      }
    }).catch(next);
  }

  deleteStore(req, res, next) {
    StoresService.deleteStore(req.params.storeId).then(data => {
      res.status(data
        ? 200
        : 404).end()
    }).catch(next);
  }

  getImages(req, res, next) {
    StoreImagesService.getImages(req.params.storeId).then(data => {
      res.send(data)
    }).catch(next);
  }

  async addImage(req, res, next) {
    await StoreImagesService.addImage(req, res, next);
  }

  updateImage(req, res, next) {
    StoreImagesService.updateImage(req.params.storeId, req.params.imageId, req.body).then(data => {
      res.end()
    });
  }

  deleteImage(req, res, next) {
    StoreImagesService.deleteImage(req.params.storeId, req.params.imageId).then(data => {
      res.end()
    });
  }

  
  isSlugExists(req, res, next) {
    StoresService.isSlugExists(req.query.slug, req.params.storeId).then(exists => {
      res.status(exists
        ? 200
        : 404).end()
    }).catch(next);
  }
}

module.exports = StoresRoute;
