const fs = require('fs');
const path = require('path');

const assert = require('power-assert');

const localesPath = path.join(__dirname, '../../../app/localization/locales');

function namespaceFiles(locale) {
  return fs.readdirSync(path.join(localesPath, locale))
    .filter((name) => name.endsWith('.json') && name !== 'index.json')
    .sort();
}

function load(locale, filename) {
  return JSON.parse(fs.readFileSync(path.join(localesPath, locale, filename), 'utf8'));
}

function tokens(value, pattern) {
  if (typeof value !== 'string') return [];
  return (value.match(pattern) || []).sort();
}

describe('Simplified Chinese localization', () => {
  it('has the same namespaces and keys as English', () => {
    const englishFiles = namespaceFiles('en');
    assert.deepEqual(namespaceFiles('zh-cn'), englishFiles);

    englishFiles.forEach((filename) => {
      assert.deepEqual(Object.keys(load('zh-cn', filename)).sort(), Object.keys(load('en', filename)).sort(), filename);
    });
  });

  it('preserves interpolation placeholders and HTML markup', () => {
    namespaceFiles('en').forEach((filename) => {
      const english = load('en', filename);
      const chinese = load('zh-cn', filename);

      Object.keys(english).forEach((key) => {
        assert.deepEqual(tokens(chinese[key], /{{[^{}]+}}/g), tokens(english[key], /{{[^{}]+}}/g), `${filename}:${key} placeholders`);
        assert.deepEqual(tokens(chinese[key], /<\/?[a-z][^>]*>/gi), tokens(english[key], /<\/?[a-z][^>]*>/gi), `${filename}:${key} HTML`);
      });
    });
  });

  it('translates the critical offline flow', () => {
    const checks = [
      ['main_menu.json', 'menu_item_play'],
      ['main_menu.json', 'play_mode_practice_name'],
      ['main_menu.json', 'play_mode_sandbox_name'],
      ['main_menu.json', 'play_mode_solo_challenges_name'],
      ['collection.json', 'new_deck_button_label'],
      ['game_setup.json', 'choose_your_opponent_header'],
      ['settings.json', 'category_visual_label'],
      ['common.json', 'offline_player_name'],
      ['challenges.json', 'challenge_begins_title'],
      ['cards.json', 'faction_1_spell_roar_name'],
      ['battle.json', 'turn_button_label_end_turn'],
      ['game_ui.json', 'label_your_turn'],
      ['codex.json', 'chapter_select_title'],
    ];

    checks.forEach(([filename, key]) => {
      const english = load('en', filename)[key];
      const chinese = load('zh-cn', filename)[key];
      assert(typeof chinese === 'string' && /[\u3400-\u9fff]/.test(chinese), `${filename}:${key} should contain Chinese text`);
      assert.notEqual(chinese, english, `${filename}:${key} should not fall back to English`);
    });
  });

  it('does not leave English fallback text outside the disabled cosmetics catalog', () => {
    const allowedIdenticalValues = new Set([
      'boss_battles.json:boss_6_name',
      'factions.json:boss_25_taunt',
      'factions.json:boss_33_taunt',
      'modifiers.json:minus_stat',
      'modifiers.json:plus_stat',
      'modifiers.json:stat_divider',
      'rift.json:progress_over_required_xp_message',
      'shop.json:payment_option_paypal',
      'tutorial.json:lesson_3_description',
      'tutorial.json:lesson_3_difficulty',
      'tutorial.json:lesson_3_failure_message',
      'tutorial.json:lesson_3_start_message',
      'tutorial.json:lesson_3_title',
    ]);
    const identicalValues = [];

    namespaceFiles('en').filter((filename) => filename !== 'cosmetics.json').forEach((filename) => {
      const english = load('en', filename);
      const chinese = load('zh-cn', filename);
      Object.keys(english).forEach((key) => {
        if (chinese[key] === english[key]) identicalValues.push(`${filename}:${key}`);
      });
    });

    assert.deepEqual(identicalValues.sort(), Array.from(allowedIdenticalValues).sort());
  });

  it('does not leave English words in localized card names or descriptions', () => {
    const chineseCards = load('zh-cn', 'cards.json');

    Object.keys(chineseCards).forEach((key) => {
      assert(!/[A-Za-z]{3,}/.test(chineseCards[key]), `cards.json:${key} contains visible English`);
    });
  });

  it('uses one vocabulary for core battle keywords', () => {
    const keywordPairs = [
      ['Airdrop', '空投'],
      ['Blast', '直击'],
      ['Deathwatch', '死亡监视'],
      ['Frenzy', '狂热'],
      ['Zeal', '热忱'],
      ['Rush', '突袭'],
      ['Opening Gambit', '登场'],
      ['Dispel', '驱散'],
      ['Stun(?:ned)?', '眩晕'],
    ];
    const legacyTerms = /手下|套牌|血源法术|砲击|炮击|冥观|宣告|解咒|击晕/;

    namespaceFiles('en').filter((filename) => filename !== 'cosmetics.json').forEach((filename) => {
      const english = load('en', filename);
      const chinese = load('zh-cn', filename);
      Object.keys(english).forEach((key) => {
        assert(!legacyTerms.test(chinese[key]), `${filename}:${key} contains legacy terminology`);
        keywordPairs.forEach(([englishKeyword, chineseKeyword]) => {
          const keywordPattern = new RegExp(`\\b(?:${englishKeyword})\\b`, 'i');
          if (keywordPattern.test(english[key])) {
            assert(chinese[key].indexOf(chineseKeyword) !== -1, `${filename}:${key} should use ${chineseKeyword}`);
          }
        });
      });
    });
  });
});
