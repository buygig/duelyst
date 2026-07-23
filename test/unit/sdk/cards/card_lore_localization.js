const fs = require('fs');
const path = require('path');

require('app-module-path').addPath(path.join(__dirname, '../../../../'));
require('coffeescript/register');

const assert = require('power-assert');
const i18next = require('i18next');

const CardLore = require('../../../../app/sdk/cards/cardLore.coffee');
const Cards = require('../../../../app/sdk/cards/cardsLookupComplete.coffee');
const EnglishLore = require('../../../../app/sdk/cards/locales/en/index.coffee');
const ChineseLore = require('../../../../app/sdk/cards/locales/zh-cn/index.coffee');

describe('Card lore localization', () => {
  const expectedKeys = Object.keys(EnglishLore);
  const originalLanguage = i18next.language;
  const originalLng = i18next.lng;

  const cipherParagraphs = {
    'Faction1.SunSister': [5, 6, 7],
    'Faction2.LightningSister': Array.from({ length: 14 }, (unused, index) => index + 4),
    'Faction3.SandSister': [7, 8, 9, 10, 11],
    'Faction4.ShadowSister': [6, 8],
    'Faction5.EarthSister': [6, 7, 8, 9],
    'Faction6.WindSister': [2, 6, 7],
  };

  after(() => {
    i18next.language = originalLanguage;
    i18next.lng = originalLng;
  });

  it('covers exactly all 49 card lore entries in both locales', () => {
    assert.equal(expectedKeys.length, 49);
    assert.deepEqual(Object.keys(ChineseLore), expectedKeys);
    assert.deepEqual(Object.values(CardLore.localeKeyByCardId).sort(), expectedKeys.slice().sort());
    assert.equal(Object.keys(CardLore.loreByCardId).length, 49);
  });

  it('keeps locale resources limited to visible content fields', () => {
    expectedKeys.forEach((key) => {
      assert.deepEqual(Object.keys(EnglishLore[key]).sort(), ['description', 'name', 'text'], `English ${key}`);
      assert.deepEqual(Object.keys(ChineseLore[key]).sort(), ['description', 'name', 'text'], `Chinese ${key}`);
    });

    Object.values(CardLore.loreByCardId).forEach((metadata) => {
      assert.deepEqual(Object.keys(metadata).sort(), ['enabled', 'id']);
    });
  });

  it('preserves all 446 paragraphs and translates every title and narrative', () => {
    let englishParagraphCount = 0;
    let chineseParagraphCount = 0;

    expectedKeys.forEach((key) => {
      const english = EnglishLore[key];
      const chinese = ChineseLore[key];
      const englishParagraphs = english.text.split('\n\n');
      const chineseParagraphs = chinese.text.split('\n\n');

      englishParagraphCount += englishParagraphs.length;
      chineseParagraphCount += chineseParagraphs.length;

      assert(english.name.length > 0, `${key} English title`);
      assert(/[\u3400-\u9fff]/.test(chinese.name), `${key} Chinese title`);
      assert(!/[A-Za-z]/.test(chinese.name), `${key} title contains visible English`);
      assert(/[\u3400-\u9fff]/.test(chinese.text), `${key} Chinese narrative`);
      assert(!/[\u200B-\u200D\uFEFF\uFFFD]/.test(`${chinese.name}\n${chinese.description}\n${chinese.text}`), `${key} contains hidden or replacement characters`);
      assert.equal(chineseParagraphs.length, englishParagraphs.length, `${key} paragraph count`);
    });

    assert.equal(englishParagraphCount, 446);
    assert.equal(chineseParagraphCount, 446);
  });

  it('preserves every original crypto-puzzle payload byte for byte', () => {
    Object.entries(cipherParagraphs).forEach(([key, indexes]) => {
      const englishParagraphs = EnglishLore[key].text.split('\n\n');
      const chineseParagraphs = ChineseLore[key].text.split('\n\n');

      indexes.forEach((index) => {
        assert.equal(chineseParagraphs[index], englishParagraphs[index], `${key} cipher paragraph ${index + 1}`);
      });
    });
  });

  it('contains no English fallback outside explicit puzzle tokens and payloads', () => {
    const exactAllowedTokens = {
      'Faction2.LightningSister': { 3: ['K'] },
      'Faction4.ShadowSister': { 2: ['U'] },
      'Neutral.SwornSister': { 11: ['THESEVENTHSTARSHINESATCOUNTERPLAYDOTCO'] },
    };

    expectedKeys.forEach((key) => {
      const cipherIndexes = new Set(cipherParagraphs[key] || []);

      ChineseLore[key].text.split('\n\n').forEach((paragraph, index) => {
        if (cipherIndexes.has(index)) return;

        let visibleText = paragraph;
        const allowedTokensForEntry = exactAllowedTokens[key] || {};
        (allowedTokensForEntry[index] || []).forEach((token) => {
          visibleText = visibleText.split(token).join('');
        });
        assert(!/[A-Za-z]/.test(visibleText), `${key} paragraph ${index + 1} contains visible English`);
      });
    });
  });

  it('uses the canonical Codex and character vocabulary', () => {
    const visibleText = Object.values(ChineseLore)
      .flatMap((entry) => [entry.name, entry.description, entry.text])
      .join('\n');
    const obsoleteTerms = [
      '哭泣树',
      '哭泣之树',
      '埃约斯',
      '神话的',
      '马加里',
      '辛凯',
      '莱昂纳',
      '利奥纳',
      '兹里克斯',
      '齐里克斯·星行者',
      '赛吉',
      '阿尔金',
      '阿尔吉恩',
      '高迈恩',
      '高梅恩',
      '海梅恩',
      '雷瓦',
      '埃文蒂德',
      '烷酮',
      '阿尔克俄涅',
      '萨翁',
      '萨恩',
      '泰格特',
      '泰盖特',
      '莫格瓦伊',
      '莫格维',
    ];

    obsoleteTerms.forEach((term) => assert(visibleText.indexOf(term) === -1, `obsolete term ${term}`));
    [
      '泣血之树',
      '伊奥斯',
      '米斯隆',
      '齐里克斯·踏星者',
      '阿吉昂·海迈恩',
      '后裔萨吉',
      '瑞瓦·暮潮',
    ].forEach((term) => assert(visibleText.indexOf(term) !== -1, `canonical term ${term}`));
  });

  it('switches en to zh-cn to en without cache or object pollution', () => {
    const cardId = Cards.Faction3.General;

    i18next.language = 'en-US';
    const firstEnglish = CardLore.loreForIdentifier(cardId);
    const firstEnglishCollection = CardLore.getAllLore();

    i18next.language = 'zh-CN';
    const chinese = CardLore.loreForIdentifier(cardId);
    const chineseCollection = CardLore.getAllLore();

    i18next.language = 'en';
    const secondEnglish = CardLore.loreForIdentifier(cardId);

    assert.equal(firstEnglish.name, EnglishLore['Faction3.General'].name);
    assert.equal(chinese.name, ChineseLore['Faction3.General'].name);
    assert.equal(secondEnglish.name, EnglishLore['Faction3.General'].name);
    assert.equal(firstEnglish.id, chinese.id);
    assert.equal(firstEnglish.enabled, chinese.enabled);
    assert(!Object.prototype.hasOwnProperty.call(chinese, 'localeKey'));
    assert.notStrictEqual(firstEnglish, chinese);
    assert.notStrictEqual(firstEnglish, secondEnglish);
    assert.notStrictEqual(firstEnglishCollection, chineseCollection);
    assert.notStrictEqual(firstEnglishCollection[0], chineseCollection[0]);

    firstEnglish.name = 'mutated';
    assert.equal(CardLore.loreForIdentifier(cardId).name, EnglishLore['Faction3.General'].name);
  });

  it('supports the simplified Chinese alias and uses English for unsupported locales', () => {
    const cardId = Cards.Faction1.General;

    i18next.language = 'zh';
    assert.equal(CardLore.loreForIdentifier(cardId).name, ChineseLore['Faction1.General'].name);

    ['en-US', 'fr', 'zh-TW', ''].forEach((language) => {
      i18next.language = language;
      i18next.lng = language;
      assert.equal(CardLore.loreForIdentifier(cardId).name, EnglishLore['Faction1.General'].name, language || 'empty locale');
    });
  });

  it('keeps all visible prose out of cardLore.coffee', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../../app/sdk/cards/cardLore.coffee'), 'utf8');

    assert(!/^\s+(?:name|description|text):/m.test(source));
    assert(source.indexOf('locales/en') !== -1);
    assert(source.indexOf('locales/zh-cn') !== -1);
  });
});
