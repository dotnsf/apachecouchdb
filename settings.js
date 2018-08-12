exports.db_username = '';
exports.db_password = '';
exports.db_host = 'localhost';
exports.db_protocol = 'http';
exports.db_port = 5984;
exports.db_name = 'testdb';
exports.app_port = 0;
exports.zerodigit = 2;
exports.enablereset = false;
exports.search_analyzer = 'japanese';
exports.search_fields = '[doc.body.name]';

if( process.env.VCAP_SERVICES ){
  var VCAP_SERVICES = JSON.parse( process.env.VCAP_SERVICES );
  if( VCAP_SERVICES && VCAP_SERVICES.cloudantNoSQLDB ){
    exports.cloudant_username = VCAP_SERVICES.cloudantNoSQLDB[0].credentials.username;
    exports.cloudant_password = VCAP_SERVICES.cloudantNoSQLDB[0].credentials.password;
  }
}
