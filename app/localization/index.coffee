Promise = require 'bluebird'
i18next = require 'i18next'
XHR = require 'i18next-xhr-backend'
LngDetector = require 'i18next-browser-languagedetector'
Storage = require 'app/common/storage'

normalizeLanguageKey = (languageKey) ->
  normalized = String(languageKey or '').toLowerCase()
  return 'zh-cn' if normalized == 'zh' or normalized.indexOf('zh-') == 0
  return 'en' if normalized == 'en' or normalized.indexOf('en-') == 0
  return 'de' if normalized == 'de' or normalized.indexOf('de-') == 0
  return 'cimode' if normalized == 'cimode'
  return null

decodeLanguageKey = (languageKey) ->
  try
    return decodeURIComponent(languageKey)
  catch error
    return languageKey

options = {
  whitelist: ['en', 'de', 'zh-cn'],
  lowerCaseLng: true,
  fallbackLng: 'en',
  contextSeparator: '$',
  defaultNS: 'translation',
  backend: {
    loadPath: "resources/locales/{{lng}}/index.json"
  },
  detection: {
    order: ['querystring', 'navigator'],
    lookupQuerystring: 'lng',
    lookupLocalStorage: Storage.namespace() + '.i18nextLng',
  }
}

p = new Promise (resolve, reject) ->

  preferredLanguageKey = Storage.get('preferredLanguageKey')
  queryLanguageMatch = window?.location?.search?.match(/[?&]lng=([^&]+)/)
  queryLanguageKey = if queryLanguageMatch? then decodeLanguageKey(queryLanguageMatch[1]) else null
  detectedLanguageKey = preferredLanguageKey or queryLanguageKey or window?.navigator?.language
  normalizedLanguageKey = normalizeLanguageKey(detectedLanguageKey)

  options.lng = normalizedLanguageKey if normalizedLanguageKey?

  i18next
    .use(LngDetector)
    .use(XHR)
    .init options, (err,t)->
      if (err)
        reject(err)
      else
        document.documentElement.lang = i18next.language if document?.documentElement?
        resolve(t)


module.exports = p
