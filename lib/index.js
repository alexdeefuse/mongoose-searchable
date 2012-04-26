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
		 *
		 */

		schema.pre('save', function(next) {
			var self = this;

			var changed = this.isNew || fields.some( function(field) {
				return self.isModified(field);
			});

			if(changed){
				var keys = this.getKeywords();
				
				var entry = new me.IndexModel({
					type		: name,
					identifier	: self._id.toString(),
					keywords	: []
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
			'keywords'	: [ {
				type: Schema.ObjectId,
				ref: 'KeywordSchema'
			} ]
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

var rank = function(word, occurences, importance, total) {
	
	
	
};