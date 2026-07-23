const fs = require('fs');
const path = require('path');

require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const assert = require('power-assert');
const i18next = require('i18next');

const Codex = require('../../../../app/sdk/codex/codex.coffee');
const EnglishChapters = require('../../../../app/sdk/codex/locales/en/index.coffee');
const ChineseChapters = require('../../../../app/sdk/codex/locales/zh-cn/index.coffee');

describe('Codex localization', () => {
  const expectedIds = Array.from({ length: 41 }, (unused, index) => String(index + 1)).concat('9999');
  const originalLanguage = i18next.language;
  const originalLng = i18next.lng;

  after(() => {
    i18next.language = originalLanguage;
    i18next.lng = originalLng;
  });

  it('covers exactly every published chapter and the coming-soon entry in both locales', () => {
    const numericSort = (left, right) => Number(left) - Number(right);

    assert.deepEqual(Object.keys(EnglishChapters).sort(numericSort), expectedIds);
    assert.deepEqual(Object.keys(ChineseChapters).sort(numericSort), expectedIds);
  });

  it('keeps localized resources to visible content fields only', () => {
    expectedIds.forEach((id) => {
      const expectedFields = id === '9999' ? ['description', 'name'] : ['description', 'name', 'text'];
      assert.deepEqual(Object.keys(EnglishChapters[id]).sort(), expectedFields, `English chapter ${id}`);
      assert.deepEqual(Object.keys(ChineseChapters[id]).sort(), expectedFields, `Chinese chapter ${id}`);
    });
  });

  it('preserves all chapter paragraphs while translating the visible prose', () => {
    expectedIds.forEach((id) => {
      const english = EnglishChapters[id];
      const chinese = ChineseChapters[id];

      assert(typeof english.name === 'string' && english.name.length > 0, `chapter ${id} English name`);
      assert(typeof english.description === 'string' && english.description.length > 0, `chapter ${id} English description`);
      assert(/[\u3400-\u9fff]/.test(chinese.name), `chapter ${id} name should contain Chinese`);
      assert.notEqual(chinese.name, english.name, `chapter ${id} name should be translated`);

      if (id === '9999') {
        assert(/[\u3400-\u9fff]/.test(chinese.description));
      } else {
        assert(typeof english.text === 'string' && english.text.length > 0, `chapter ${id} English text`);
        assert(typeof chinese.text === 'string' && /[\u3400-\u9fff]/.test(chinese.text), `chapter ${id} text should contain Chinese`);
        assert.equal(chinese.text.split('\n\n').length, english.text.split('\n\n').length, `chapter ${id} paragraph count`);
      }
    });
  });

  it('switches en to zh-cn to en without mutating or caching localized objects', () => {
    i18next.language = 'en-US';
    const firstEnglish = Codex.chapterForIdentifier(1);

    i18next.language = 'zh-CN';
    const chinese = Codex.chapterForIdentifier(1);

    i18next.language = 'en';
    const secondEnglish = Codex.chapterForIdentifier(1);

    assert.equal(firstEnglish.name, EnglishChapters['1'].name);
    assert.equal(chinese.name, ChineseChapters['1'].name);
    assert.equal(secondEnglish.name, EnglishChapters['1'].name);
    assert.equal(firstEnglish.id, chinese.id);
    assert.equal(firstEnglish.img, chinese.img);
    assert.notEqual(firstEnglish.name, chinese.name);
    assert.notStrictEqual(firstEnglish, chinese);
    assert.notStrictEqual(firstEnglish, secondEnglish);
  });

  it('supports the simplified Chinese alias and falls back to English for unsupported locales', () => {
    i18next.language = 'zh';
    assert.equal(Codex.chapterForIdentifier(2).name, ChineseChapters['2'].name);

    ['en-US', 'fr', 'zh-TW', ''].forEach((language) => {
      i18next.language = language;
      i18next.lng = language;
      assert.equal(Codex.chapterForIdentifier(2).name, EnglishChapters['2'].name, language || 'empty locale');
    });
  });

  it('returns chapters in explicit numeric order and keeps coming soon disabled', () => {
    i18next.language = 'en';
    const chapters = Codex.getAllChapters();

    assert.deepEqual(chapters.map((chapter) => String(chapter.id)), expectedIds);
    assert.equal(chapters[chapters.length - 1].enabled, false);
    assert(!Object.prototype.hasOwnProperty.call(chapters[chapters.length - 1], 'text'));
  });

  it('contains no visible English fallback and keeps recurring lore terms consistent', () => {
    const visibleText = Object.values(ChineseChapters)
      .flatMap((chapter) => [chapter.name, chapter.description, chapter.text])
      .filter((value) => typeof value === 'string')
      .join('\n');
    const obsoleteTerms = [
      '因西克莉',
      '塞迪尔',
      '艾玛拉',
      '星行者',
      '星辰教团',
      '提维亚',
      '夏安',
      '日铸城',
      '纪元预言',
      '衰败时代',
      '风暴战车',
      '灵能收割者',
      '忠诚的老兵西利萨',
    ];

    assert(!/[A-Za-z]/.test(visibleText), 'Codex should not contain visible English fallback text');
    obsoleteTerms.forEach((term) => assert(visibleText.indexOf(term) === -1, `Codex should not contain inconsistent term ${term}`));
  });

  it('keeps visible chapter prose out of codex.coffee', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../../app/sdk/codex/codex.coffee'), 'utf8');

    assert(!/^\s+(?:name|description|text):/m.test(source));
    assert(source.indexOf('locales/en') !== -1);
    assert(source.indexOf('locales/zh-cn') !== -1);
  });
});
