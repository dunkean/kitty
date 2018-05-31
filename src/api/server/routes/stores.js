'use strict';

const security = require('../lib/security');
const StoresService = require('../services/stores/stores');

class ProductStoresRoute {
  constructor(router) {
    this.router = router;
    this.registerRoutes();
  }

  registerRoutes() {
    this.router.get('/v1/stores', security.checkUserScope.bind(this, security.scope.READ_STORES), this.getStores.bind(this));
    this.router.post('/v1/stores', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.addStore.bind(this));
    this.router.get('/v1/stores/:id', security.checkUserScope.bind(this, security.scope.READ_STORES), this.getSingleStore.bind(this));
    this.router.put('/v1/stores/:id', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.updateStore.bind(this));
    this.router.delete('/v1/stores/:id', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.deleteStore.bind(this));
    this.router.post('/v1/stores/:id/image', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.uploadStoreImage.bind(this));
    this.router.delete('/v1/stores/:id/image', security.checkUserScope.bind(this, security.scope.WRITE_STORES), this.deleteStoreImage.bind(this));
  }

  getStores(req, res, next) {
    StoresService.getStores(req.query).then((data) => {
      res.send(data)
    }).catch(next);
  }

  getSingleStore(req, res, next) {
    StoresService.getSingleStore(req.params.id).then((data) => {
      if (data) {
        res.send(data)
      } else {
        res.status(404).end()
      }
    }).catch(next);
  }

  addStore(req, res, next) {
    StoresService.addStore(req.body).then((data) => {
      res.send(data)
    }).catch(next);
  }

  updateStore(req, res, next) {
    StoresService.updateStore(req.params.id, req.body).then((data) => {
      if (data) {
        res.send(data)
      } else {
        res.status(404).end()
      }
    }).catch(next);
  }

  deleteStore(req, res, next) {
    StoresService.deleteStore(req.params.id).then(data => {
      res.status(data
        ? 200
        : 404).end()
    }).catch(next);
  }

  uploadStoreImage(req, res, next) {
    StoresService.uploadStoreImage(req, res, next);
  }

  deleteStoreImage(req, res, next) {
    StoresService.deleteStoreImage(req.params.id);
    res.end();
  }
}

module.exports = ProductStoresRoute;
