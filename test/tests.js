var assert = require('assert');

var langpacks = require('../lib/generate_langpacks').process_file;


beforeEach(function() {
    global.navigator = {l10n: undefined};
});


describe('generate_langpacks', function() {
  it('sets navigator.l10n.language', function(done) {
    langpacks('test/messages.po', 'es', null, function(err, data) {
        eval(data);
        assert.equal(navigator.l10n.language, 'es');
        done();
    });
  });

  it('sets localized string', function(done) {
    langpacks('test/messages.po', 'es', null, function(err, data) {
        eval(data);
        assert.equal(navigator.l10n.strings['string'].body,
                     'translatedString');
        done();
    });
  });

  it('sets plural string', function(done) {
    langpacks('test/messages.po', 'es', null, function(err, data) {
        eval(data);
        assert.equal(navigator.l10n.strings['plural'].body, '');
        assert.equal(navigator.l10n.strings['plural'].plural, 'plurals');
        assert.deepEqual(navigator.l10n.strings['plural'].plurals,
                         ['onePlural', 'twoPlurals']);
        done();
    });
  });

  it('sets non-localized string', function(done) {
    langpacks('test/messages.po', 'es', null, function(err, data) {
        eval(data);
        assert.equal(navigator.l10n.strings['noTranslations'].body, '');
        done();
    });
  });
});
