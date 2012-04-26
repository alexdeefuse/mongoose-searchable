var natural		= require('natural'),
	metaphone	= natural.Metaphone,
	stemmer		= natural.PorterStemmer;
	
var _			= require('underscore');
	
stemmer.attach();
metaphone.attach();

var me = module.exports = exports = { 
	
	/**
	 *	mongoose plugin
	 */
	
	hook: function(schema, options) {
		if( !Array.isArray(options.fields) ) {
			options.fields = [ options.fields ];
		}
		var fields	= options.fields.slice();
		var name	= options.name;
		
		/**
		 *
		 */
		
		schema.methods.getKeywords = function(){
			var self = this;
			
			var values = fields.map(function(field, i){
				return self.get(field);
			});
			
			return me.process(values);;
		}
		
		/**
		 *	save middleware
		 *
		 *	is responsible for updating the keywords on the fields
		 *	
		 *	1. we get the keywords
		 *	2. get word count and total number of fields
		 *	3. iterate over keywords
		 *	4. iterate over keyword scores and do a total score
		 *	5. the assign the keyword to the overall keywords
		 *	6. and then save all
		 */

		schema.pre('save', function(next) {
			var self = this;

			var changed = this.isNew || fields.some( function(field) {
				return self.isModified(field);
			});

			if(changed){
				var result = this.getKeywords();
				
				var keywords = [];
				
				var word_count	= _.size(result);
				var fields_no	= fields.length;
				
				for(var k in result){
					if(result.hasOwnProperty(k)){
						var word_score = 0;
						for(var j = 0; j < result[k].length; j++){
							word_score += rank( result[k][j], fields_no-j, word_count )
						}
						
						keywords.push({ word: k, rank: word_score });
					}
				}
				
				var entry = new me.IndexModel({
					type		: name,
					identifier	: self._id.toString(),
					keywords	: keywords
				}).save(function(err){
					if(err) return next(err);
					
					
				});
				
			}
			next();
		});
	},
	
	/**
	 *	collection name
	 *
	 *	should be set before setup passed as the second param into setup
	 */
	
	collection_name: 'SearchableIndex',
	
	/**
	 *	mongoose ref
	 */
	
	_mongoose: null,
	
	/**
	 *	searchable setup
	 *
	 *	receive mongoose reference and optional 
	 *	a collection name to be used when indexing
	 */
	
	IndexModel		: null,

	setup: function(mongoose, name) {
		var Schema = mongoose.Schema;

		name = name || this.collection_name;
		this.collection_name = name;
		
		this._mongoose = mongoose;
		
		var KeywordSchema = new Schema({
			word	: { type: String, required: true },
			rank	: { type: Number, required: true }
		});

		var IndexSchema = new Schema({
			'type'		: { type: String, required: true },
			'identifier': { type: String, required: true },
			'keywords'	: [ KeywordSchema ]
		});

		IndexSchema.path('keywords').index(true);

		mongoose.model( name, IndexSchema );
		
		me.IndexModel = mongoose.model( name );
	},
	
	/**
	 *	process
	 *
	 *	what this does is to construct an array of occurences based on importance
	 *	
	 *	{
	 *	RNK: [ 1 ],
	 *	LRT: [ 1, 2 ],
	 *	TLKN: [ 0, 1 ],
	 *  }
	 *
	 *	with the above:
	 *	each keyword gets assigned an array.
	 *	the array index represents importance and 
	 *	the value at an index the number of occurences
	 *	
	 *	for instance we have 1 occurence of "LRT" in a high importance field
	 *	and 2 occurences in a lower importance field
	 */
	
	process: function(values){
		var result = {}
		
		for(var j = 0; j < values.length; j++){
			var arr = values[j].tokenizeAndStem();
			
			var i = 0;
			for(i = 0; i < arr.length; i++){
				arr[i] = metaphone.process( arr[i] );//.toLowerCase();
			}
			arr.sort();

			i = arr.length;
			while(i--){
				if(!result[arr[i]]){
					result[arr[i]] = [ 0 ];
				}
				result[arr[i]][j] = result[arr[i]][j] ? ++result[arr[i]][j] : 1;
			}	
		}
		
		return result;
	}
	
};

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

var rank = function(occurences, importance, total) {
	if( occurences == 0 ){
		return 0;
	}
	return total*importance+occurences;
	
};