'use strict';

const security = require('../lib/security');
const BrandsService = require('../services/brands/brands');
const BrandImagesService = require('../services/brands/images');

class BrandsRoute {
  constructor(router) {
    this.router = router;
    this.registerRoutes();
  }

  registerRoutes() {
    this.router.get('/v1/brands', security.checkUserScope.bind(this, security.scope.READ_BRANDS), this.getBrands.bind(this));
    this.router.post('/v1/brands', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.addBrand.bind(this));
    this.router.get('/v1/brands/:brandId', security.checkUserScope.bind(this, security.scope.READ_BRANDS), this.getSingleBrand.bind(this));
    this.router.put('/v1/brands/:brandId', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.updateBrand.bind(this));
    this.router.delete('/v1/brands/:brandId', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.deleteBrand.bind(this));

    this.router.get('/v1/brands/:brandId/images', security.checkUserScope.bind(this, security.scope.READ_BRANDS), this.getImages.bind(this));
    this.router.post('/v1/brands/:brandId/images', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.addImage.bind(this));
    this.router.put('/v1/brands/:brandId/images/:imageId', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.updateImage.bind(this));
    this.router.delete('/v1/brands/:brandId/images/:imageId', security.checkUserScope.bind(this, security.scope.WRITE_BRANDS), this.deleteImage.bind(this));

    this.router.get('/v1/brands/:brandId/slug', security.checkUserScope.bind(this, security.scope.READ_BRANDS), this.isSlugExists.bind(this));
  }

  getBrands(req, res, next) {
    BrandsService.getBrands(req.query).then(data => {
      res.send(data)
    }).catch(next);
  }

  getSingleBrand(req, res, next) {
    BrandsService.getSingleBrand(req.params.brandId).then(data => {
      if (data) {
        res.send(data)
      } else {
        res.status(404).end()
      }
    }).catch(next);
  }

  addBrand(req, res, next) {
    BrandsService.addBrand(req.body).then(data => {
      res.send(data)
    }).catch(next);
  }

  updateBrand(req, res, next) {
    BrandsService.updateBrand(req.params.brandId, req.body).then(data => {
      if (data) {
        res.send(data)
      } else {
        res.status(404).end()
      }
    }).catch(next);
  }

  deleteBrand(req, res, next) {
    BrandsService.deleteBrand(req.params.brandId).then(data => {
      res.status(data
        ? 200
        : 404).end()
    }).catch(next);
  }

  getImages(req, res, next) {
    BrandImagesService.getImages(req.params.brandId).then(data => {
      res.send(data)
    }).catch(next);
  }

  async addImage(req, res, next) {
    await BrandImagesService.addImage(req, res, next);
  }

  updateImage(req, res, next) {
    BrandImagesService.updateImage(req.params.brandId, req.params.imageId, req.body).then(data => {
      res.end()
    });
  }

  deleteImage(req, res, next) {
    BrandImagesService.deleteImage(req.params.brandId, req.params.imageId).then(data => {
      res.end()
    });
  }

  isSlugExists(req, res, next) {
    BrandsService.isSlugExists(req.query.slug, req.params.brandId).then(exists => {
      res.status(exists
        ? 200
        : 404).end()
    }).catch(next);
  }
}

module.exports = BrandsRoute;
