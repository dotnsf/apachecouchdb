// app.js

var cfenv = require( 'cfenv' );
var NodeCouchDb = require( 'node-couchdb' );
var express = require( 'express' );
var bodyParser = require( 'body-parser' );
var crypto = require( 'crypto' );
var app = express();

var settings = require( './settings' );
var appEnv = cfenv.getAppEnv();

//. Install CouchDB into Ubuntu 16.04
//. https://www.hugeserver.com/kb/how-install-apache-couchdb-ubuntu-16/

//. npm
//. https://www.npmjs.com/package/node-couchdb
var couch = new NodeCouchDb(
  /*
  {
    auth: { user: db_username, pass: db_password },
    host: db_host,
    protocol: db_protocol,
    port: db_port
  }
  */
);

createDesignDocument();

app.use( express.static( __dirname + '/public' ) );
//app.use( bodyParser.urlencoded( { extended: true, limit: '10mb' } ) );
app.use( bodyParser.urlencoded() );
app.use( bodyParser.json() );

app.post( '/doc', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  console.log( 'POST /doc' );
  //console.log( req.body );

  if( !couch ){
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'couchdb is not initialized.' }, 2, null ) );
    res.end();
  }else{
    couch.get( settings.db_name, '_design/library/_view/bytimestamp', { descending: true, limit: 1 } ).then( function( data, headers, status ){
    //couch.get( settings.db_name, '_design/library/_view/bytimestamp', {} ).then( function( data, headers, status ){
      console.log( data ); // {"status":true,"data":{"data":{"total_rows":0,"offset":0,"rows":[]},"headers":{"transfer-encoding":"chunked","server":"CouchDB/1.6.0 (Erlang OTP/18)","etag":"\"34N63VMP2LKZRRILSMN7NVU79\"","date":"Sun, 12 Aug 2018 12:25:23 GMT","content-type":"application/json","cache-control":"must-revalidate"},"status":200}}

      var prev_doc = null;
      if( data && data.data ){
        var body = data.data;
        if( body.rows && body.rows.length ){
          prev_doc = body.rows[0]; //body.rows[body.rows.length-1];
          console.log( 'prev_doc' );
          console.log( prev_doc );
        }
      }

      couch.uniqid().then( function( id ){
        var doc = req.body;
        doc._id = id[0];
        doc.timestamp = ( new Date() ).getTime();
        //console.log( doc );

        couch.insert( settings.db_name, doc ).then( function( data, headers, status ){
          console.log( data );
          res.write( JSON.stringify( { status: true, data: data }, 2, null ) );
          res.end();
        }).catch( function( err ){
          console.log( err );
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
          res.end();
        });
      }).catch( function( err ){
        console.log( err );
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      })
    }).catch( function( err ){
      console.log( err );
      res.status( 400 );
      res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
      res.end();
    });
  }
});

app.get( '/doc/:id', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.params.id;
  console.log( 'GET /doc/' + id );

  if( !couch ){
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'couchdb is not initialized.' }, 2, null ) );
    res.end();
  }else{
    couch.get( settings.db_name, id ).then( function( data, headers, status ){
      console.log( data );
      res.write( JSON.stringify( { status: true, doc: data }, 2, null ) );
      res.end();
    }).catch( function( err ){
      console.log( err );
      res.status( 400 );
      res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
      res.end();
    });
  }
});

app.get( '/doc/:id/attachment', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.params.id;
  console.log( 'GET /doc/' + id + '/attachment' );
  if( db ){
    db.get( id, { include_docs: true }, function( err, body ){
      if( err ){
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      }else{
        //. body._attachments.(attachname) : { content_type: '', data: '' }
        if( body._attachments ){
          for( key in body._attachments ){
            var attachment = body._attachments[key];
            if( attachment.content_type ){
              res.contentType( attachment.content_type );
            }

            //. 添付画像バイナリを取得する
            db.attachment.get( id, key, function( err, buf ){
              if( err ){
                res.contentType( 'application/json; charset=utf-8' );
                res.status( 400 );
                res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
                res.end();
              }else{
                res.end( buf, 'binary' );
              }
            });
          }
        }else{
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: 'No attachment found.' }, 2, null ) );
          res.end();
        }
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'hashchainsolo is failed to initialize.' }, 2, null ) );
    res.end();
  }
});

app.get( '/docs', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  console.log( 'GET /docs' );

  if( !couch ){
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'couchdb is not initialized.' }, 2, null ) );
    res.end();
  }else{
    //couch.get( settings.db_name, '_design/library/_view/bytimestamp', { descending: true, limit: 1 } ).then( function( data, headers, status ){
    couch.get( settings.db_name, '_design/library/_view/bytimestamp', {} ).then( function( data, headers, status ){
      //console.log( data );
      if( data && data.data ){
        var body = data.data.rows;
        res.write( JSON.stringify( { status: true, docs: body }, 2, null ) );
        res.end();
      }else{
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: 'failed to get documents.' }, 2, null ) );
        res.end();
      }
    }).catch( function( err ){
      console.log( err );
      res.status( 400 );
      res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
      res.end();
    });
  }
});


app.delete( '/doc/:id', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var id = req.params.id;
  console.log( 'DELETE /doc/' + id );

  if( !couch ){
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'couchdb is not initialized.' }, 2, null ) );
    res.end();
  }else{
    couch.get( settings.db_name, id ).then( function( doc, headers, status ){
      console.log( doc );

      couch.del( settings.db_name, id, doc._rev ).then( function( data, headers, status ){
        console.log( data );
        res.write( JSON.stringify( { status: true, doc: data }, 2, null ) );
        res.end();
      }).catch( function( err ){
        console.log( err );
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
        res.end();
      });
    }).catch( function( err ){
      console.log( err );
      res.status( 400 );
      res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
      res.end();
    });
  }
});


/*
 You need to create search index 'design/search' with name 'newSearch' in your Cloudant DB before executing this API.
 */
app.get( '/search', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  console.log( 'GET /search' );
  if( db ){
    var q = req.query.q;
    if( q ){
      db.search( 'library', 'newSearch', { q: q }, function( err, body ){
        if( err ){
          res.status( 400 );
          res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
          res.end();
        }else{
          res.write( JSON.stringify( { status: true, result: body }, 2, null ) );
          res.end();
        }
      });
    }else{
      res.status( 400 );
      res.write( JSON.stringify( { status: false, message: 'parameter: q is required.' }, 2, null ) );
      res.end();
    }
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'hashchainsolo is failed to initialize.' }, 2, null ) );
    res.end();
  }
});


app.post( '/reset', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  console.log( 'POST /reset' );
  if( !couch ){
    res.status( 400 );
    res.write( JSON.stringify( { status: false, message: 'couchdb is not initialized.' }, 2, null ) );
    res.end();
  }else{
    couch.get( settings.db_name, '_design/library/_view/bytimestamp', {} ).then( function( data, headers, status ){
      if( data && data.data ){
        var docs = data.data.rows;
        docs.forEach( function( doc ){
          couch.del( settings.db_name, doc._id, doc._rev ).then( function( data, headers, status ){
          }).catch( function( err ){
          });
        });
        res.write( JSON.stringify( { status: true }, 2, null ) );
        res.end();
      }else{
        res.status( 400 );
        res.write( JSON.stringify( { status: false, message: 'failed to get documents.' }, 2, null ) );
        res.end();
      }
    }).catch( function( err ){
      console.log( err );
      res.status( 400 );
      res.write( JSON.stringify( { status: false, message: err }, 2, null ) );
      res.end();
    });
  }
});


function sortDocuments( _docs ){
  var docs = [];
  for( var i = 0; i < _docs.length; i ++ ){
    var _doc = _docs[i];
    if( 'hashchainsolo_system' in _doc && 'timestamp' in _doc.hashchainsolo_system ){
      var b = false;
      for( var j = 0; j < docs.length && !b; j ++ ){
        if( docs[j].hashchainsolo_system.timestamp > _doc.hashchainsolo_system.timestamp ){
          docs.splice( j, 0, _doc );
          b = true;
        }
      }
      if( !b ){
        docs.push( _doc );
      }
    }
  }

  return docs;
}

function createDesignDocument(){
  var search_index_function = 'function (doc) { index( "default", doc._id ); }';
  if( settings.search_fields ){
    search_index_function = 'function (doc) { index( "default", ' + settings.search_fields + '.join( " " ) ); }';
  }

  //. デザインドキュメント作成
  var design_doc = {
    _id: "_design/library",
    language: "javascript",
    views: {
      bytimestamp: {
        map: "function (doc) { if( doc.timestamp ){ emit(doc.timestamp, doc); } }"
      }
    },
    indexes: {
      newSearch: {
        "analyzer": settings.search_analyzer,
        "index": search_index_function
      }
    }
  };

  if( couch ){
    couch.insert( settings.db_name, design_doc ).then( function( data, headers, status ){
      console.log( 'design document successfully created.')
      console.log( data );
    }).catch( function( err ){
      console.log( 'exception catched:' );
      console.log( err );
    });
  }else{
    console.log( 'couchdb is not initialized.' );
  }
}

function countTopZero( str ){
  var cnt = 0;

  while( str.length <= cnt || str.charAt( cnt ) == '0' ){
    cnt ++;
  }

  return cnt;
}


var port = /*appEnv.port ||*/ settings.app_port || 3000;
app.listen( port );
console.log( 'server started on ' + port );
