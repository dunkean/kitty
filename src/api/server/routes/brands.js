'use strict';

const security = require('../lib/security');
const BrandsService = require('../services/brands/brands');

class ProductBrandsRoute {
  constructor(router) {
    this.router = router;
    this.registerRoutes();
  }

  registerRoutes() {
    this.router.get('/v1/brands', security.checkUserScope.bind(this, security.scope.READ_BRANDS), this.getBrands.bind(this));
    this.router.post('/v1/brands', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.addBrand.bind(this));
    this.router.get('/v1/brands/:id', security.checkUserScope.bind(this, security.scope.READ_BRANDS), this.getSingleBrand.bind(this));
    this.router.put('/v1/brands/:id', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.updateBrand.bind(this));
    this.router.delete('/v1/brands/:id', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.deleteBrand.bind(this));
    this.router.post('/v1/brands/:id/image', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.uploadBrandImage.bind(this));
    this.router.delete('/v1/brands/:id/image', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.deleteBrandImage.bind(this));
  }

  getBrands(req, res, next) {
    BrandsService.getBrands(req.query).then((data) => {
      res.send(data)
    }).catch(next);
  }

  getSingleBrand(req, res, next) {
    BrandsService.getSingleBrand(req.params.id).then((data) => {
      if (data) {
        res.send(data)
      } else {
        res.status(404).end()
      }
    }).catch(next);
  }

  addBrand(req, res, next) {
    BrandsService.addBrand(req.body).then((data) => {
      res.send(data)
    }).catch(next);
  }

  updateBrand(req, res, next) {
    BrandsService.updateBrand(req.params.id, req.body).then((data) => {
      if (data) {
        res.send(data)
      } else {
        res.status(404).end()
      }
    }).catch(next);
  }

  deleteBrand(req, res, next) {
    BrandsService.deleteBrand(req.params.id).then(data => {
      res.status(data
        ? 200
        : 404).end()
    }).catch(next);
  }

  uploadBrandImage(req, res, next) {
    BrandsService.uploadBrandImage(req, res, next);
  }

  deleteBrandImage(req, res, next) {
    BrandsService.deleteBrandImage(req.params.id);
    res.end();
  }
}

module.exports = ProductBrandsRoute;
