var natural		= require('natural'),
	metaphone	= natural.Metaphone,
	stemmer		= natural.PorterStemmer;
	
stemmer.attach();
metaphone.attach();

module.exports = exports = function(schema, options) {
	
}

module.exports.setup = function(mongoose, name){
	name = name || 'SearchableIndex';
	
	var Keyword = new Schema({
		word	: { type: String, required: true },
		rank	: { type: Number, required: true }
	});
	
	var IndexSchema = new Schema({
		'type'		: { type: String, required: true },
		'identifier': { type: String, required: true },
		'keywords'	: [ String ]
	});
	
	IndexSchema.path('keywords').index(true);
	
	mongoose.model( name, IndexSchema );
}

/**
 *	Score our word:
 *	
 *	I've gone with the following formula:
 *	s = t * i + o
 *
 *	s = score
 *	t = total unique words
 *	i = word importance
 *	o = occurences
 *
 *	word importance should start at 1 and go up
 *	1 is low importance and x ( x > 1 ) means higher importance
 */

var rank = function(word, occurences, importance, total){
	
	
	
};