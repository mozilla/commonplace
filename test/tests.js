var assert = require('assert');

var i18njs = require('../lib/generate_i18njs').process_file;


beforeEach(function() {
  global.navigator = {l10n: undefined};
});


describe('generate_i18njs', function() {
  it('sets navigator.l10n.language', function(done) {
    i18njs('test/messages.po', 'es', null, function(err, data) {
      eval(data);
      assert.equal(navigator.l10n.language, 'es');
      done();
    });
  });

  it('sets localized string', function(done) {
    i18njs('test/messages.po', 'es', null, function(err, data) {
      eval(data);
      assert.equal(navigator.l10n.strings['My String'],
                   'El String');
      done();
    });
  });

  it('sets plural string', function(done) {
    i18njs('test/messages.po', 'es', null, function(err, data) {
      eval(data);
      assert.deepEqual(navigator.l10n.strings['Result'],
                       ['Resulto', 'N Resultos']);
      done();
    });
  });

  it('sets plural string with three forms', function(done) {
    i18njs('test/messages.po', 'es', null, function(err, data) {
      eval(data);
      assert.deepEqual(navigator.l10n.strings['Triple Result'],
                       ['Un Resulto', 'Dos Resultos', 'Resultos']);
      done();
    });
  });

  it('sets partially localized plural string', function(done) {
    i18njs('test/messages.po', 'es', null, function(err, data) {
      eval(data);
      assert.deepEqual(
        navigator.l10n.strings['Partially Localized Plural String'],
        ['PLPS', '', 'PLPSes']);
      done();
    });
  });

  it('sets partially identical plural strings', function(done) {
    i18njs('test/messages.po', 'es', null, function(err, data) {
      eval(data);
      assert.ok('Partially Identical Plural String' in navigator.l10n.strings);
      assert.deepEqual(
        navigator.l10n.strings['Partially Identical Plural String'],
        ['Partially Identical Plural String',
         'Partially Identical Plural Strings',
         'Something Else', 'Something Else']);
      done();
    });
  });

  it('sets no plural form string', function(done) {
    i18njs('test/messages.po', 'es', null, function(err, data) {
      eval(data);
      assert.deepEqual(
        navigator.l10n.strings['No Plural Form String'], 'NPFS');
      done();
    });
  });

  it('does not set non-localized string', function(done) {
    i18njs('test/messages.po', 'es', null, function(err, data) {
      eval(data);
      assert.ok(!('My Non-Localized String' in navigator.l10n.strings));
      done();
    });
  });

  it('does not set non-localized plural string', function(done) {
    i18njs('test/messages.po', 'es', null, function(err, data) {
      eval(data);
      assert.ok(!('Non-Localized Result' in navigator.l10n.strings));
      done();
    });
  });

  it('does not set identical string', function(done) {
    i18njs('test/messages.po', 'es', null, function(err, data) {
      eval(data);
      assert.ok(!('Identical String' in navigator.l10n.strings));
      done();
    });
  });

  it('does not set identical plural string', function(done) {
    i18njs('test/messages.po', 'es', null, function(err, data) {
      eval(data);
      assert.ok(!('Identical Plural String' in navigator.l10n.strings));
      done();
    });
  });

  it('sets pluralizer', function(done) {
    i18njs('test/messages.po', 'es', null, function(err, data) {
      assert.ok(!navigator.l10n);
      eval(data);
      assert.equal(navigator.l10n.pluralize.toString(),
                   'function (n) {\n  return (n != 1);\n}');
      done();
    });
  });
});
