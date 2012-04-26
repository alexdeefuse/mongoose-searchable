var should		= require('should'),
	_			= require('underscore');

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

var BookSchema = new Schema({
	title: String,
	author: String,
	price: Number
});
BookSchema.plugin(Searchable.hook, { name: 'Book', fields: 'title author'.split(' ') });

var PageSchema = new Schema({
	number: Number,
	content: String
});
PageSchema.plugin(Searchable.hook, { name: 'Page', fields: 'content' });

var Book = mongoose.model('Book', BookSchema);
var Page = mongoose.model('Page', PageSchema);

/**
 *	testing
 */

describe('searchable', function(){
	
	before(function(done){
		mongoose.connection.on('open', done);
	});
	
	beforeEach(function(done){
		Searchable.IndexModel.remove({}, function(){
			Page.remove({}, function(){
				Book.remove({}, done);
			});
		});
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
	
	it('should define a "getKeywords" method on model', function(done){
		Book.prototype.getKeywords.should.be.a('function');
		done();
	});
	
	it('should return processed keywords by "getKeywords"', function(done){
		var b = new Book({
			title	: 'Lord of the rings',
			author	: 'John Ronald Reuel Tolkien'
		});
		var keywords = b.getKeywords();
		_.isObject( keywords ).should.be.true;
		_.keys( keywords ).length.should.be.above(0);
		done();
	});
	
	it('should count occurences of keywords', function(done){
		var b = new Book({
			title	: 'Lord of the rings Lord',
			author	: 'John Ronald Reuel Tolkien'
		});
		
		var keywords = b.getKeywords();
		
		done();
	});
	
	it('should copy keywords from linked collections', function(done){
		var b = new Book({
			title	: 'Lord of the rings',
			author	: 'Lord John Lord Ronald Reuel Tolkien'
		});
		b.save(function(err){
			should.not.exist(err);
			done();
		})
	});
/*	
	it('should allow each linked collection to be searched independently', function(done){
		
		Book.create( [
			{ title: 'Book 1', author: 'alex ghiu' },
			{ title: 'My Second Book ', author: 'alex ghiu' },
			{ title: 'Third ', author: 'alex ghiu' },
			{ title: 'His ', author: 'cristi ghiu' },
		], function(err){
			should.not.exist( err );
			
			Book.search( 'book', function(err, list){
				should.not.exist(err);
				
				list.should.have.length( 2 );
				
				done();
			} );
		} );
		
	});
	
	it('should return results for queries bigger than one word', function(done){
		
		Book.create( [
			{ title: 'Book 1', author: 'alex ghiu' },
			{ title: 'My Second Book ', author: 'alex ghiu' },
			{ title: 'Third ', author: 'alex ghiu' },
			{ title: 'His ', author: 'cristi ghiu' },
		], function(err){
			should.not.exist( err );
			
			Book.search( 'book alex', function(err, list){
				should.not.exist(err);
				
				list.should.have.length( 3 );
				
				done();
			} );
		} );
		
	});
*/	
	it('should allow global searching on all linked collections', function(done){
		
		Book.create( [
			{ title: 'Book 1', author: 'alex ghiu' },
			{ title: 'My Second Book ', author: 'alex ghiu' },
			{ title: 'Third ', author: 'alex ghiu' },
			{ title: 'His ', author: 'cristi ghiu' },
		], function(err){
			Page.create([
				{ content: 'As he went to read his book, he snaped his finger on the switch' },
				{ content: 'Booking stuff on the web is hard' },
				{ content: 'I hear you shouting: Alex, Alex!' },
			], function(){
				
				Searchable.search( 'book alex', function(err, list){
					should.not.exist(err);
					
					list.should.have.length( 6 );
					
					done();
				});
				
			});
		});
		
	});
	
	it('should allow to restrict the number of collections to be searched');
	
	it('should allow sorting on returned results');
	
	it('should allow the returning of diffrent types of documents');
	
	it('should delete index along with document');
	
});