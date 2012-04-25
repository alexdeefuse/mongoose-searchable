var should		= require('should');

var mongoose	= require('mongoose'),
	Schema		= mongoose.Schema;
	
var Searchable	= require('../');

/**
 *	setup
 */

Searchable.setup( mongoose );

mongoose.connect('localhost', 'mongoose_searchable');

/**
 *	schemas
 */

/**
 *	testing
 */

describe('searchable', function(){
	
	before(function(done){
		mongoose.connection.on('open', done);
	});
	
	it('should have a setup to link to mongoose', function(done){
		Searchable.should.have.property('setup');
		done();
	});
	
	it('should have a collection name property', function(done){
		Searchable.should.have.property('collection_name');
		done();
	});
	
	it('should create its own collection', function(done){
		var c = 0;
		try{
			mongoose.model(Searchable.collection_name);
		}catch(e){
			c++;
		}
		c.should.equal(0);
		done();
	});
	
	it('should add expose a plugin to be added to other schemas', function(done){
		Searchable.should.have.property('hook');
		done();
	});
	
	it('should copy keywords from linked collections', function(done){
		
	});
	
	it('should allow each linked collection to be searched independently');
	
	it('should allow global searching on all linked collections');
	
	it('should allow to restrict the number of collections to be searched');
	
	it('should allow sorting on returned results');
	
	it('should allow the returning of diffrent types of documents');
	
});