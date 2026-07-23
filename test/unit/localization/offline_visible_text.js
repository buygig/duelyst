const fs = require('fs');
const path = require('path');

const assert = require('power-assert');

const root = path.join(__dirname, '../../..');

const forbiddenByFile = {
  'app/ui/templates/composite/game_bottom_bar.hbs': ['>Real Time<'],
  'app/ui/templates/composite/play_mode_select.hbs': ['>Play Select<'],
  'app/ui/templates/item/activity_dialog.hbs': ['>cancel<'],
  'app/ui/templates/item/announcement_modal.hbs': ['>GOT IT<'],
  'app/ui/templates/item/change_username.hbs': ['>Change<', '>OK<', 'common.change_username_success'],
  'app/ui/templates/item/prompt_dialog.hbs': ['>OK<'],
  'app/ui/templates/item/utility_loading_login_menu.hbs': ['>Menu<'],
  'app/ui/views/item/change_username.js': ['3 to 18 alphanumeric characters', 'Username must be different'],
  'app/ui/views/item/select_username.js': ['3 to 18 alphanumeric characters'],
  'app/ui/views2/collection/deck_card_back_select.js': ['.text(\'Unlock\')', '.text(\'Unavailable\')', '.text(\'Save\')'],
  'app/ui/views2/collection/templates/deck_card_back_select.hbs': ['>Card Back<', '>Cancel<'],
  'app/ui/views2/profile/templates/profile_error_item.hbs': ['>ERROR:'],
  'app/ui/views2/profile/templates/profile_match_history_collection.hbs': ['>share<'],
  'app/ui/views2/profile/templates/profile_region_loading_item.hbs': ['>Loading<'],
};

describe('Offline-visible localized text', () => {
  it('does not reintroduce the known hardcoded English copy', () => {
    Object.keys(forbiddenByFile).forEach((relativePath) => {
      const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
      forbiddenByFile[relativePath].forEach((text) => {
        assert(source.indexOf(text) === -1, `${relativePath} contains hardcoded text: ${text}`);
      });
    });
  });

  it('localizes every main-menu scene name shown by the offline scene switcher', () => {
    const chinese = JSON.parse(fs.readFileSync(path.join(root, 'app/localization/locales/zh-cn/cosmetics.json'), 'utf8'));
    const sceneKeys = [
      'scene_magaari_name',
      'scene_obsidian_woods_name',
      'scene_frostfire_festival_name',
      'scene_city_of_kaero_name',
      'scene_unearthed_prophecy_name',
    ];

    sceneKeys.forEach((key) => {
      assert(/[\u3400-\u9fff]/.test(chinese[key]), `${key} should contain Chinese text`);
    });
  });
});
