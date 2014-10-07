// Alert any errors during testing.
casper.on('page.error', function(err, trace) {
    console.error(err);
    trace.forEach(function(item) {
        console.log('  ', item.file, ':', item.line);
    });
});

casper.start('http://localhost:8675/tests', function() {
    console.log('Started initial navigation.');
});

casper.waitFor(function() {
    return casper.exists('progress[value="1"]');
});

casper.then(function() {
    casper.test.assertEquals(casper.fetchText('#c_failed'), '0',
                             'Assert no failures');
    casper.test.assertEquals(casper.fetchText('#c_started'),
                             casper.fetchText('#c_passed'),
                             'Assert all tests ended');
});

casper.run(function() {
    casper.test.done(2);
});
