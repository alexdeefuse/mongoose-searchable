var natural		= require('natural'),
	metaphone	= natural.Metaphone,
	stemmer		= natural.PorterStemmer;
	
var _			= require('underscore');
	
stemmer.attach();
metaphone.attach();

var me = module.exports = exports = { 
	
	/**
	 *	setup
	 *
	 *
	 *
	 *
	 *
	 *
	 */
	
	/** holds index collection reference */
	IndexModel		: null,
	
	/** used collections */
	_collection_name: 'searchableindex',
	_temporary_collection_name: 'searchabletemporary',
	
	/** internal mongoose reference */
	_mongoose: null,
	
	setup: function(mongoose) {
		var Schema = mongoose.Schema;

		this._mongoose = mongoose;

		var IndexSchema = new Schema({
			'type'		: { type: String, required: true },
			'identifier': { type: String, required: true },
			'keyword'	: { type: String, required: true },
			'rank'		: { type: Number, required: true }
		});

		IndexSchema.path('keyword').index(true);

		mongoose.model( me._collection_name, IndexSchema );

		me.IndexModel = mongoose.model( me._collection_name );
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
			var arr = me.convertStringToKeys(values[j]);

			var i = arr.length;
			while(i--){
				if(!result[arr[i]]){
					result[arr[i]] = [ 0 ];
				}
				result[arr[i]][j] = result[arr[i]][j] ? ++result[arr[i]][j] : 1;
			}	
		}
		
		return result;
	},
	
	/**
	 *	general purpose
	 *	converts a string into KWRDS (keywords) that the lib uses
	 */
	
	convertStringToKeys: function(str){
		var arr = str.tokenizeAndStem();

		for(var i = 0; i < arr.length; i++){
			arr[i] = metaphone.process( arr[i] );//.toLowerCase();
		}
		
		return arr;
	},
	
	/**
	 *	search
	 *	
	 *	handles general search
	 *
	 *
	 *
	 */
	
	search: function(query, callback){
		var self = this;
		var keywords = me.convertStringToKeys(query);

		var mapFn = function(){
			emit( this.identifier, { rank: this.rank, type: this.type } );
		}

		var reduceFn = function(key, values){
			var result = {rank: 0, type: '' };

			values.forEach(function(value){
				result.rank += value.rank;
				result.type = value.type;
			});

			return result;
		}

		var command = {
			mapreduce	: me._collection_name,
			query		: { 'keyword': { $in: keywords } },
			map			: mapFn.toString(),
			reduce		: reduceFn.toString(),
			out			: { 'replace' : me._temporary_collection_name},
		}
		
		var mongoose = me._mongoose;

		mongoose.connection.db.executeDbCommand(command, function(err, dbres) {
			mongoose.connection.db.collection(me._temporary_collection_name, function(err, collection){
				collection.find({}).sort({ 'value.rank': -1 }).toArray(function(err, results){
					callback( err, results );
				});
			})
		});
			
	},
	
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

	rank: function(occurences, importance, total) {
		if( occurences == 0 ){
			return 0;
		}
		return total*importance+occurences;

	},
	
	/**
	 *	mongoose plugin
	 *
	 *	adds save and remove middleware
	 *	handles interal hooked list
	 *	adds model search static method
	 */
	
	/** remember the names of all hooked schemas */
	_hooked: [],

	hook: function(schema, options) {
		if( !Array.isArray(options.fields) ) {
			options.fields = [ options.fields ];
		}
		var fields	= options.fields.slice();
		var name	= options.name;
		
		me._hooked.push(name);
		
		/**
		 *	get keywords
		 *
		 *	return keywords before saving
		 */
		
		schema.methods.getKeywords = function(){
			var self = this;
			
			var values = fields.map(function(field, i){
				return self.get(field);
			});
			
			return me.process(values);
		}
		
		/**
		 *	search static on model
		 *
		 *	
		 *	needs sooo much optimization and improvement
		 *	nothing is being done with keywords score..
		 *
		 *	TODO: optimize
		 */
		
		schema.statics.search = function( query, callback ){
			var self = this;
			var query = me.process( [ query ] );
			var conditions = { 'keyword': { $in: _.keys( query ) } };
			
			me.IndexModel.find( conditions ).run( function(err, list){
				var target_ids = _.pluck( list, 'identifier' );
				
				self.find({ '_id': { $in: target_ids } }, function(err, results){
					//	TO DO: do something with keywords...
					
					callback.call(self, err, results);
				});
			});
		}
		
		/**
		 *	save middleware
		 *
		 *	is responsible for updating the keywords on the fields
		 */
		
		//	TODO:
		//	this doesn't work correctly anymore.
		//	updating should clean all keywords and add new ones !!!

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
							word_score += me.rank( result[k][j], fields_no-j, word_count )
						}
						
						keywords.push({ type: name, identifier: self._id, keyword: k, rank: word_score });
					}
				}
				
				me.IndexModel.create( keywords, next);
				
			}
			next();
		});
		
		/**
		 *	remove middleware
		 *	
		 *	remove the indexed model
		 */

		schema.pre('remove', function(next){
			me.IndexModel.remove({ type: name, identifier: self._id.toString() }, next);
		});
	},
	
};
