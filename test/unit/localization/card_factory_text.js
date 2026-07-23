const fs = require('fs');
const path = require('path');

const assert = require('power-assert');

const root = path.join(__dirname, '../../..');
const factoryPath = path.join(root, 'app/sdk/cards/factory');
const localesPath = path.join(root, 'app/localization/locales');

function coffeeFiles(directory) {
  return fs.readdirSync(directory).flatMap((entry) => {
    const target = path.join(directory, entry);
    const stat = fs.statSync(target);
    if (stat.isDirectory()) return coffeeFiles(target);
    return entry.endsWith('.coffee') ? [target] : [];
  });
}

function sourceWithoutComments(filename) {
  return fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');
}

function literalValues(source, pattern) {
  const values = [];
  let match;
  while ((match = pattern.exec(source)) !== null) values.push(match[2]);
  return values;
}

describe('Card factory localization', () => {
  it('only references localization keys that exist in both languages', () => {
    const english = {};
    const chinese = {};

    fs.readdirSync(path.join(localesPath, 'en'))
      .filter((filename) => filename.endsWith('.json') && filename !== 'index.json')
      .forEach((filename) => {
        const namespace = path.basename(filename, '.json');
        english[namespace] = JSON.parse(fs.readFileSync(path.join(localesPath, 'en', filename), 'utf8'));
        chinese[namespace] = JSON.parse(fs.readFileSync(path.join(localesPath, 'zh-cn', filename), 'utf8'));
      });

    coffeeFiles(factoryPath).forEach((filename) => {
      const source = sourceWithoutComments(filename);
      const references = [];
      const translatedReferencePattern = /(?:i18next\.t\(\s*|card\.name\s*=\s*)(["'])([a-z0-9_-]+)\.([^"']+)\1/g;
      const rawCardOrModifierKeyPattern = /(["'])((?:cards|modifiers)\.([a-z0-9_.-]+))\1/gi;
      let match;

      while ((match = translatedReferencePattern.exec(source)) !== null) {
        references.push({ namespace: match[2], key: match[3], index: match.index });
      }
      while ((match = rawCardOrModifierKeyPattern.exec(source)) !== null) {
        const separator = match[2].indexOf('.');
        references.push({ namespace: match[2].slice(0, separator), key: match[2].slice(separator + 1), index: match.index });
      }

      references.forEach(({ namespace, key, index }) => {
        const location = `${path.relative(root, filename)}:${source.slice(0, index).split('\n').length}`;
        assert(english[namespace], `${location} unknown namespace ${namespace}`);
        assert(Object.prototype.hasOwnProperty.call(english[namespace], key), `${location} missing English ${namespace}.${key}`);
        assert(Object.prototype.hasOwnProperty.call(chinese[namespace], key), `${location} missing Chinese ${namespace}.${key}`);
      });
    });
  });

  it('does not hardcode player-visible card text in card factories', () => {
    coffeeFiles(factoryPath)
      .forEach((filename) => {
        const source = sourceWithoutComments(filename);
        const relative = path.relative(root, filename);
        const names = literalValues(source, /card\.name\s*=\s*(["'])(.*?)\1/g);
        const descriptions = literalValues(source, /card\.setDescription\(\s*(["'])(.*?)\1\s*\)/g);

        names.forEach((value) => {
          assert(value.length === 0 || /^[a-z0-9_-]+\.[a-z0-9_.-]+$/i.test(value), `${relative} hardcoded card name: ${value}`);
        });
        descriptions.forEach((value) => {
          assert(value.length === 0, `${relative} hardcoded card description: ${value}`);
        });
      });
  });

  it('does not hardcode names or descriptions in card-factory fields', () => {
    coffeeFiles(factoryPath).forEach((filename) => {
      const source = sourceWithoutComments(filename);
      const relative = path.relative(root, filename);
      const statusValues = literalValues(
        source,
        /(?:[a-z]+Name|[a-z]+Description|name|description)\s*[:=]\s*(["'])(.*?)\1/gi,
      );

      statusValues.forEach((value) => {
        assert(value.length === 0 || /^(?:cards|modifiers)\.[a-z0-9_.-]+$/i.test(value), `${relative} hardcoded status text: ${value}`);
      });
    });
  });
});
