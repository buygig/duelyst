const path = require('path');

require('app-module-path').addPath(path.join(__dirname, '../../../'));
require('babel-register');

const { expect } = require('chai');
const {
  OFFLINE_EXCLUDED_RESOURCE_DIRECTORIES,
  shouldIncludeResourcePackage,
} = require('../../../gulp/rsx');

describe('offline resource package filter', () => {
  it('excludes resource packages from online-only directories', () => {
    OFFLINE_EXCLUDED_RESOURCE_DIRECTORIES.forEach((directory) => {
      expect(shouldIncludeResourcePackage({
        img: `${directory}/sample.png`,
      }), directory).to.equal(false);
    });
  });

  it('checks every supported package path field', () => {
    [
      'img',
      'imgPosX',
      'imgNegX',
      'imgPosY',
      'imgNegY',
      'imgPosZ',
      'imgNegZ',
      'audio',
      'plist',
      'font',
    ].forEach((field) => {
      expect(shouldIncludeResourcePackage({
        [field]: 'resources/shop/sample.bin',
      }), field).to.equal(false);
    });
  });

  it('normalizes Windows and app-relative paths before checking directories', () => {
    expect(shouldIncludeResourcePackage({
      img: 'app\\resources\\emotes\\sample.png',
    })).to.equal(false);
  });

  it('keeps similarly named and gameplay resource directories', () => {
    expect(shouldIncludeResourcePackage({
      img: 'resources/shopkeeper/sample.png',
    })).to.equal(true);
    expect(shouldIncludeResourcePackage({
      img: 'resources/units/sample.png',
    })).to.equal(true);
  });

  it('does not use the removed CDN flag as a product boundary', () => {
    expect(shouldIncludeResourcePackage({
      img: 'resources/shop/sample.png',
      cdn: true,
    })).to.equal(false);
    expect(shouldIncludeResourcePackage({
      img: 'resources/units/sample.png',
      cdn: true,
    })).to.equal(true);
  });
});
