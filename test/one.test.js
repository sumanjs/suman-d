

const suman = require('suman');
const Test = suman.init(module);


const Promise = require('bluebird');

Test.create('firm', function(it){

  55..times(function(){

    it('is cool', t => {
      return Promise.delay(10);
    });

  });

});