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
	
	it('should return score of search', function(done){
		
		var mapFn = function(){
			emit( this.keywords, { count: 1 } );
		}
		
		var reduceFn = function(key, values){
			var result = { count: 1 };
			
			values.forEach(function(value){
				result.count += value.count;
			});
			
			return result;
		}
		
		var command = {
			mapreduce	: 'searchableindexes',
			query		: { 'keywords.word': { $in: ['ALKS'] } },
			map			: mapFn.toString(),
			reduce		: reduceFn.toString(),
			out			: { inline : 1}
		}
		
		mongoose.connection.db.executeDbCommand(command, function(err, dbres){
			should.not.exist(err);
			console.log(dbres);
			console.log( JSON.stringify( dbres.documents[0].results ) );
			
			done();
		});
		
	});
	
});