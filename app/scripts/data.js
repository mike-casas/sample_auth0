[
  {
    "name": "access control",
    "templates": [
      {
        "id": "access-on-weekdays-only-for-an-app",
        "title": "Allow Access during weekdays for a specific App",
        "summary": "By using this rule you'll be able to prevent access during weekends.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule is used to prevent access during weekends for a specific app.</p>\n",
        "code": "function (user, context, callback) {\n\n  if (context.clientName === 'TheAppToCheckAccessTo') {\n    var d = new Date().getDay();\n\n    if (d === 0 || d === 6) {\n      return callback(new UnauthorizedError('This app is available during the week'));\n    }\n  }\n\n  callback(null, user, context);\n}"
      },
      {
        "id": "active-directory-groups",
        "title": "Active Directory group membership",
        "summary": "By using this rule you'll be able to check if the user is member of a specific group.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule checks if a user belongs to an AD group and if not, it will return Access Denied.</p>\n<blockquote>\n<p>Note: you can mix this with <code>context.clientID</code> or <code>clientName</code> to do it only for specific application</p>\n</blockquote>\n",
        "code": "function (user, context, callback) {\n    var groupAllowed = 'group1';\n    var userHasAccess = user.groups.some(\n      function (group) {\n        return groupAllowed === group;\n      });\n\n    if (!userHasAccess) {\n      return callback(new UnauthorizedError('Access denied.'));\n    }\n\n    callback(null, user, context);\n}"
      },
      {
        "id": "check-domains-against-connection-aliases",
        "title": "Check user email domain matches domains configured in connection",
        "summary": "By using this rule you can validate that the user is login in from an authorized domain.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule will check that the email the user has used to login matches any of the domains configured in a connection. If there are no domains configured, it will allow access.</p>\n<blockquote>\n<p>Note: this rule uses Auth0 API v2. You need to get a token from the <a href=\"https://auth0.com/docs/apiv2\">API explorer</a>. The required scope is <code>read:connections</code>.</p>\n</blockquote>\n",
        "code": "function (user, context, callback) {\n  request('https://login.auth0.com/api/v2/connections', {\n    headers: {\n      Authorization: 'Bearer ' + configuration.AUTH0_API_TOKEN  //TODO: replace with your own Auth0 APIv2 token\n    }  \n  },\n  function(e,r,b){\n    if(e) return callback(e);\n\n    var connections = JSON.parse(b);\n    var connection = connections[_.findIndex(connections,function(c){\n      return (c.name === context.connection);\n    })];\n\n    //No domains -> access allowed\n    if( !connection.options.tenant_domain ) return callback(null, user, context);\n\n    //Access allowed if domains is found.\n    if( _.findIndex(connection.options.domain_aliases,function(d){\n     return user.email.indexOf(d) >= 0;\n    }) >= 0 ) return callback(null, user, context);\n\n    return callback('Access denied');\n  });\n}"
      },
      {
        "id": "check_last_password_reset",
        "title": "Check last password reset",
        "summary": "By using this rule you'll be able to enforce a password change.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule will check the last time that a user changed his or her account password.</p>\n",
        "code": "function (user, context, callback) {\n\n  function daydiff (first, second) {\n    return (second-first)/(1000*60*60*24);\n  }\n\n  var last_password_change = user.last_password_reset || user.created_at;\n\n  if (daydiff(new Date(last_password_change), new Date()) > 30) {\n    return callback(new UnauthorizedError('please change your password'));\n  }\n\n  callback(null, user, context);\n}"
      },
      {
        "id": "custom-scopes",
        "title": "Custom authorization scopes",
        "summary": "By using this rule you'll be able to map scope values to properties.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule maps arbitrary <code>scope</code> values to actual properties in the user profile.</p>\n",
        "code": "function (user, context, callback) {\n  // The currently requested scopes can be accessed as follows:\n  // context.request.query.scope.match(/\\S+/g)\n  var scopeMapping = {\n    contactInfo: [\"name\", \"email\", \"company\"],\n    publicInfo: [\"public_repos\", \"public_gists\"]\n  };\n  context.jwtConfiguration.scopes = scopeMapping;\n  callback(null, user, context);\n}"
      },
      {
        "id": "disable-resource-owner",
        "title": "Disable the Resource Owner endpoint",
        "summary": "By using this rule you'll be able to disable the Resource Owner endpoint.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule is used to disable the Resource Owner endpoint (to prevent users from bypassing MFA policies).</p>\n",
        "code": "function (user, context, callback) {\n  if (context.protocol === 'oauth2-resource-owner') {\n    return callback(\n      new UnauthorizedError('The resource owner endpoint cannot be used.'));\n  }\n  callback(null, user, context);\n}"
      },
      {
        "id": "disable-social-signup",
        "title": "Disable social signups",
        "summary": "By using this rule you'll be able to prevent social connections.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule is used to prevent signups using social connections.</p>\n",
        "code": "function (user, context, callback) {\n\n  var CLIENTS_ENABLED = ['REPLACE_WITH_YOUR_CLIENT_ID'];\n  // run only for the specified clients\n  if (CLIENTS_ENABLED.indexOf(context.clientID) === -1) {\n    return callback(null, user, context);\n  }\n\n  // initialize app_metadata\n  user.app_metadata = user.app_metadata || {};\n\n  // if it is the first login (hence the `signup`) and it is a social login\n  if (context.stats.loginsCount === 1 && user.identities[0].isSocial) {\n\n    // turn on the flag\n    user.app_metadata.is_signup = true;\n\n    // store the app_metadata\n    auth0.users.updateAppMetadata(user.user_id, user.app_metadata)\n      .then(function(){\n        // throw error\n        return callback('Signup disabled');\n      })\n      .catch(function(err){\n        callback(err);\n      });\n\n    return;\n  }\n\n  // if flag is enabled, throw error\n  if (user.app_metadata.is_signup) {\n    return callback('Signup disabled');\n  }\n\n  // else it is a non social login or it is not a signup\n  callback(null, user, context);\n}"
      },
      {
        "id": "dropbox-whitelist",
        "title": "Whitelist on the cloud",
        "summary": "By using this rule you'll be able to whitelist users based on a file in Dropbox.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule denies/grant access to users based on a list of emails stored in Dropbox.</p>\n",
        "code": "function (user, context, callback) {\n  request.get({\n    url: 'https://dl.dropboxusercontent.com/u/21665105/users.txt'\n  }, function (err, response, body) {\n    var whitelist = body.split('\\r\\n');\n\n    var userHasAccess = whitelist.some(function (email) {\n      return email === user.email;\n    });\n\n    if (!userHasAccess) {\n      return callback(new UnauthorizedError('Access denied.'));\n    }\n\n    callback(null, user, context);\n  });\n}"
      },
      {
        "id": "email-verified",
        "title": "Force email verification",
        "summary": "By using this rule you can restrict access to users that have verified their emails.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule will only allow access users that have verified their emails.\nNote that it might be a better UX to make this verification from your application.</p>\n<p>If you are using <a href=\"https://auth0.com/docs/lock\">Lock</a>, the default behavior is to log in a user immediately after they have signed up.\nTo prevent this from immediately displaying an error to the user, you can pass the following option to <code>lock.show()</code> or similar: <code>loginAfterSignup: false</code>.\nIf you are using <a href=\"https://auth0.com/docs/libraries/auth0js\">auth0.js</a>, the equivalent option is <code>auto_login: false</code>.</p>\n",
        "code": "function (user, context, callback) {\n  if (!user.email_verified) {\n    return callback(new UnauthorizedError('Please verify your email before logging in.'));\n  } else {\n    return callback(null, user, context);\n  }\n}"
      },
      {
        "id": "ip-address-whitelist",
        "title": "IP Address whitelist",
        "summary": "By using this rule you'll be able whitelist a set of ip addresses.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule will only allow access to an app from a specific set of IP addresses</p>\n",
        "code": "function (user, context, callback) {\n    var whitelist = ['1.2.3.4', '2.3.4.5']; //authorized IPs\n    var userHasAccess = whitelist.some(\n      function (ip) {\n        return context.request.ip === ip;\n      });\n\n    if (!userHasAccess) {\n      return callback(new UnauthorizedError('Access denied from this IP address.'));\n    }\n\n    return callback(null, user, context);\n}"
      },
      {
        "id": "link-users-by-email",
        "title": "Link Accounts with Same Email Address",
        "summary": "By using this rule you'll be able to link any accounts that have the same email address.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule will link any accounts that have the same email address.</p>\n<blockquote>\n<p>Note: When linking accounts, only the metadata of the target user is saved. If you want to merge the metadata of the two accounts you must do that manually. See the document on <a href=\"https://auth0.com/docs/link-accounts\">Linking Accounts</a> for more details.</p>\n</blockquote>\n",
        "code": "/**\n * This Auth0 rule will link 2 accounts with the same email address. It will use the oldest account as the primary\n * so that a oAuth user_id in Auth0 does not change from out beneath you\n *\n * @param user\n * @param context\n * @param callback\n * @returns {*}\n */\nfunction(user, context, callback) {\n  console.log('entering link accts rule with user', user);\n  console.log('context', context);\n\n  if (!user.email_verified) { //dont merge un-verified\n    console.error('* email NOT verified, returning');\n    return callback(null, user, context);\n  }\n\n  var currUserTmp     = user.user_id.split('|'),\n      currUserProvier = currUserTmp[0],\n      currUserId      = currUserTmp[1];\n\n  var userApiUrl   = auth0.baseUrl + '/users',\n      bearerHeader = 'Bearer ' + auth0.accessToken;\n\n  request({\n      url:     userApiUrl,\n      headers: {\n        Authorization: bearerHeader\n      },\n      qs:      {\n        search_engine: 'v2',\n        q:             'email:\"' + user.email + '\"',\n      }\n    },\n    function(err, response, body) {\n      if (err) {\n        return callback(err);\n      }\n\n      console.log('search result', body);\n      if (response.statusCode !== 200) {\n        return callback(new Error(body));\n      }\n\n      try {\n        var data = JSON.parse(body);\n        if (data.length <= 0) {\n          console.log('* No other users with same email address. returning');\n          return callback(null, user, context);\n        }\n\n        //There is a timing issue/bug where user that initated this rule, is not yet returning from the search results\n        var currUserInSearchResult = data.some(function(u) {\n          return u.identities.some(function(ident) {\n            return (ident.provider === currUserProvier && ident.user_id === currUserId);\n          });\n        });\n        if (!currUserInSearchResult) {\n          console.log('* current user NOT in search result. Manually adding', user.user_id);\n          data.push({\n            email_verified: true,\n            user_id:        user.user_id,\n            created_at:     user.created_at\n          });\n        }\n\n        data.sort(function(a, b) {\n          if (b.created_at > a.created_at) {\n            return -1;\n          } else if (b.created_at < a.created_at) {\n            return 1;\n          } else {\n            return 0;\n          }\n        });\n\n        var primaryUser = data.shift();\n        console.log('primary user', primaryUser);\n\n        if (data.length <= 0) {\n          console.log('* No other users with same email address.');\n          return callback(null, user, context);\n        }\n\n        async.each(data, function(targetUser, cb) {\n          if (!targetUser.email_verified) {\n            console.log('* targetUser', targetUser, 'does not have verified email. Skipping');\n            return cb();\n          }\n\n          var aryTmp       = targetUser.user_id.split('|'),\n              provider     = aryTmp[0],\n              targetUserId = aryTmp[1];\n\n          console.log('* linking', targetUser.user_id);\n          request.post({\n            url:     userApiUrl + '/' + primaryUser.user_id + '/identities',\n            headers: {\n              Authorization: bearerHeader\n            },\n            json:    {provider: provider, user_id: targetUserId}\n          }, function(err, response, body) {\n            if (response.statusCode >= 400) {\n              cb(new Error('Error linking account: ' + response.statusMessage));\n            }\n            cb(err);\n          });\n\n        }, function(err) {\n          if (err) {\n            console.error('async err', err);\n          }\n          callback(err, user, context);\n        });\n      } catch (e) {\n        console.error('catch err', e);\n        callback(e);\n      }\n    });\n}"
      },
      {
        "id": "roles-creation",
        "title": "Set roles to a user",
        "summary": "By using this rule you can add roles to a user.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule adds a Roles field to the user based on some pattern</p>\n",
        "code": "function (user, context, callback) {\n  user.app_metadata = user.app_metadata || {};\n  // You can add a Role based on what you want\n  // In this case I check domain\n  var addRolesToUser = function(user, cb) {\n    if (user.email.indexOf('@gonto.com') > -1) {\n      cb(null, ['admin']);\n    } else {\n      cb(null, ['user']);\n    }\n  };\n\n  addRolesToUser(user, function(err, roles) {\n    if (err) {\n      callback(err);\n    } else {\n      user.app_metadata.roles = roles;\n      auth0.users.updateAppMetadata(user.user_id, user.app_metadata)\n        .then(function(){\n          callback(null, user, context);\n        })\n        .catch(function(err){\n          callback(err);\n        });\n    }\n  });\n}"
      },
      {
        "id": "simple-domain-whitelist",
        "title": "Email domain whitelist",
        "summary": "By using this rule you can whitelist users based on the domain of their email addresses.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule will only allow access to users with specific email domains.</p>\n",
        "code": "function (user, context, callback) {\n    var whitelist = ['example.com', 'example.org']; //authorized domains\n    var userHasAccess = whitelist.some(\n      function (domain) {\n        var emailSplit = user.email.split('@');\n        return emailSplit[emailSplit.length - 1].toLowerCase() === domain;\n      });\n\n    if (!userHasAccess) {\n      return callback(new UnauthorizedError('Access denied.'));\n    }\n\n    return callback(null, user, context);\n}"
      },
      {
        "id": "simple-user-whitelist-for-app",
        "title": "Whitelist for a Specific App",
        "summary": "By using this rule you can whitelist users based on their usernames.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule will only allow access to users with specific email addresses on a specific app.</p>\n",
        "code": "function (user, context, callback) {\n    //we just care about NameOfTheAppWithWhiteList\n    //bypass this rule for every other app\n    if(context.clientName !== 'NameOfTheAppWithWhiteList'){\n      return callback(null, user, context);\n    }\n\n    var whitelist = [ 'user1@mail.com', 'user2@mail.com' ]; //authorized users\n    var userHasAccess = whitelist.some(\n      function (email) {\n        return email === user.email;\n      });\n\n    if (!userHasAccess) {\n      return callback(new UnauthorizedError('Access denied.'));\n    }\n\n    callback(null, user, context);\n}"
      },
      {
        "id": "simple-user-whitelist",
        "title": "Whitelist",
        "summary": "By using this rule you can whitelist users based on their email addresses.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule will only allow access to users with specific email addresses.</p>\n",
        "code": "function (user, context, callback) {\n    var whitelist = [ 'user1@mail.com', 'user2@mail.com' ]; //authorized users\n    var userHasAccess = whitelist.some(\n      function (email) {\n        return email === user.email;\n      });\n\n    if (!userHasAccess) {\n      return callback(new UnauthorizedError('Access denied.'));\n    }\n\n    callback(null, user, context);\n}"
      },
      {
        "id": "simple-whitelist-on-a-connection",
        "title": "Whitelist on Specific Connection",
        "summary": "By using this rule you can whitelist users based on the connection they used to sign in.",
        "categories": [
          "access control"
        ],
        "description": "<p>This rule will only allow access to certain users coming from a specific connection (e.g. fitbit).</p>\n",
        "code": "function (user, context, callback) {\n\n    // We check users only authenticated with 'fitbit'\n    if(context.connection === 'fitbit'){\n\n      var whitelist = [ 'user1', 'user2' ]; //authorized users\n      var userHasAccess = whitelist.some(\n        function (name) {\n          return name === user.name;\n        });\n\n      if (!userHasAccess) {\n        return callback(new UnauthorizedError('Access denied.'));\n      }\n    }\n\n    callback(null, user, context);\n}"
      }
    ]
  },
  {
    "name": "enrich profile",
    "templates": [
      {
        "id": "add-attributes",
        "title": "Add attributes to a user for specific connection",
        "summary": "By using this rule you can enrich the user profile with attributes.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule will add an attribute to the user only for the login transaction (i.e. they won&#39;t be persisted to the user). This is useful for cases where you want to enrich the user information for a specific application.</p>\n",
        "code": "function (user, context, callback) {\n  if (context.connection === 'company.com') {\n    user.vip = true;\n  }\n\n  callback(null, user, context);\n}"
      },
      {
        "id": "add-country",
        "title": "Add country to the user profile",
        "summary": "By using this rule you can enrich the profile with the country of the user.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule will add a <code>country</code> attribute to the user based on their ip address.</p>\n",
        "code": "function (user, context, callback) {\n  if (context.request.geoip) {\n    user.country = context.request.geoip.country_name;\n  }\n\n   // Example geoip object:\n   // \"geoip\": {\n   //    \"country_code\": \"AR\",\n   //    \"country_code3\": \"ARG\",\n   //    \"country_name\": \"Argentina\",\n   //    \"region\": \"05\",\n   //    \"city\": \"Cordoba\",\n   //    \"latitude\": -31.41349983215332,\n   //    \"longitude\": -64.18109893798828,\n   //    \"continent_code\": \"SA\",\n   //    \"time_zone\": \"America/Argentina/Cordoba\"\n   //  }\n\n  callback(null, user, context);\n}"
      },
      {
        "id": "add-income",
        "title": "Add zipcode median household income to the user profile",
        "summary": "By using this rule you can enrich the profile with the income of the user.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule will add an <code>income</code> (median household income) attribute to the user based on the zipcode of their ip address. It is based on the last US Census data (not available for other countries).</p>\n",
        "code": "function (user, context, callback) {\n\n    user.user_metadata = user.user_metadata || {};\n    var geoip = user.user_metadata.geoip || context.request.geoip;\n\n    if (!geoip || geoip.country_code !== 'US') return callback(null, user, context);\n\n    if(global.incomeData === undefined) {\n        retrieveIncomeData(user, geoip, context, callback);\n    } else {\n        setIncomeData(global.incomeData, user, geoip, context, callback);\n    }\n\n    function retrieveIncomeData(user, geoip, context, callback) {\n        request({\n            url: 'http://cdn.auth0.com/zip-income/householdincome.json'\n        }, function (e,r,b) {\n            if(e) return callback(e);\n            if(r.statusCode===200){\n                var incomeData = JSON.parse(b);\n                global.incomeData = incomeData;\n                setIncomeData(incomeData,user,context, callback);\n            }\n            callback(null, user, context);\n        });\n    }\n\n    function setIncomeData(incomeData, user, geoip, context, callback) {\n        if (incomeData[geoip.postal_code]) {\n            user.user_metadata.zipcode_income = incomeData[geoip.postal_code];\n            auth0.users.updateUserMetadata(user.user_id, user.user_metadata)\n                .then(function(){\n                    callback(null, user, context);\n                })\n                .catch(function(err){\n                    callback(err);\n                });\n        }\n    }\n}"
      },
      {
        "id": "add-persistent-attributes",
        "title": "Add persistent attributes to the user",
        "summary": "By using this rule you can enrich the profile of a user and persist that information in auth0 user store.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule count set the default color (an example preference) to a user (using user_metadata`).</p>\n",
        "code": "function (user, context, callback) {\n  user.user_metadata = user.user_metadata || {};\n  user.user_metadata.color = user.user_metadata.color || 'blue';\n\n  auth0.users.updateUserMetadata(user.user_id, user.user_metadata)\n    .then(function(){\n        callback(null, user, context);\n    })\n    .catch(function(err){\n        callback(err);\n    });\n}"
      },
      {
        "id": "add-roles-from-sqlserver",
        "title": "Add user roles from a SQL Server database",
        "summary": "By using this rule you can enrich the profile of a user with a set of roles retrieved from SQL Server.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule will query a SQL server database on each login and add a <code>roles</code> array to the user.</p>\n<blockquote>\n<p>Note: you can store the connection string securely on Auth0 encrypted configuration. Also make sure when you call an external endpoint to open your firewall/ports to our IP address which you can find it in the rules editor. This happens when you query SQL Azure for example.</p>\n</blockquote>\n",
        "code": "function (user, context, callback) {\n  getRoles(user.email, function(err, roles) {\n    if (err) return callback(err);\n\n    user.roles = roles;\n\n    callback(null, user, context);\n  });\n\n  // Queries a table by e-mail and returns associated 'Roles'\n  function getRoles(email, done) {\n    var connection = sqlserver.connect({\n      userName:  '<user_name>',\n      password:  '<password>',\n      server:    '<db_server_name>',\n      options: {\n        database: '<db_name>',\n        encrypt:  true,\n        rowCollectionOnRequestCompletion: true\n      }\n    }).on('errorMessage', function (error) {\n      console.log(error.message);\n    });\n\n    var query = \"SELECT Email, Role \" +\n                \"FROM dbo.Role WHERE Email = @email\";\n\n    connection.on('connect', function (err) {\n      if (err) return done(new Error(err));\n\n      var request = new sqlserver.Request(query, function (err, rowCount, rows) {\n        if (err) return done(new Error(err));\n\n        var roles = rows.map(function (row) {\n          return row[1].value;\n        });\n\n        done(null, roles);\n      });\n\n      request.addParameter('email', sqlserver.Types.VarChar, email);\n\n      connection.execSql(request);\n    });\n  }\n}"
      },
      {
        "id": "decrypt-sensitive-data",
        "title": "Decrypt sensitive data from the user profile",
        "summary": "By using this rule you can get an encrypted value from app_metadata.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule will get a sensitive value in the app_metadata and decrypt it (see the <a href=\"/rules/encrypt-sensitive-data.md\">Encrypt sensitive data in the user profile</a> rule for information on how to encrypt the data).</p>\n<p>Note, for this to work you&#39;ll need to set 2 configuration settings:</p>\n<ul>\n<li><code>ENCRYPT_PASSWORD</code>, eg: <strong>S0me,Password!è§</strong></li>\n<li><code>ENCRYPT_IV</code>, eg: <strong>abcjfiekdpaifjfd</strong></li>\n</ul>\n<p>And here&#39;s an example of how you would decrypt this in .NET:</p>\n",
        "code": "function (user, context, callback) {\n  user.app_metadata = user.app_metadata || { };\n\n  var private_data = decrypt(user.app_metadata.private_data);\n  if (private_data.license_key === '1234567') {\n    user.role = 'admin';\n  }\n\n  return callback(null, user, context);\n\n  function decrypt(data) {\n    if (!data) {\n      return { };  \n    }\n    var iv = new Buffer(configuration.ENCRYPT_IV);\n    var encodeKey = crypto.createHash('sha256')\n    .update(configuration.ENCRYPT_PASSWORD, 'utf-8').digest();\n    var cipher = crypto.createDecipheriv('aes-256-cbc', encodeKey, iv);\n    var decrypted = cipher.update(data, 'base64', 'utf8') + cipher.final('utf8');\n    return JSON.parse(decrypted);\n  }\n}"
      },
      {
        "id": "encrypt-sensitive-data",
        "title": "Encrypt sensitive data in the user profile",
        "summary": "By using this rule you can set an encrypted value in app_metadata.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule will set a sensitive value in the app_metadata and encrypt it (see the <a href=\"/rules/decrypt-sensitive-data.md\">Decrypt sensitive data from the user profile</a> rule for information on how to decrypt the data).</p>\n<p>The <code>user</code> will look like this after the encryption:</p>\n<p>Note, for this to work you&#39;ll need to set two configuration settings. Both should be random strings:</p>\n<ul>\n<li><code>ENCRYPT_PASSWORD</code></li>\n<li><code>ENCRYPT_IV</code></li>\n</ul>\n",
        "code": "function (user, context, callback) {\n  user.app_metadata = user.app_metadata || { };\n  user.app_metadata.private_data = encrypt({\n    license_key: '1234567',\n    social_security_number: '56789'\n  });\n\n  callback(null, user, context);\n\n  function encrypt(data) {\n    var iv = new Buffer(configuration.ENCRYPT_IV);\n    var decodeKey = crypto.createHash('sha256')\n      .update(configuration.ENCRYPT_PASSWORD, 'utf-8').digest();\n    var cipher = crypto.createCipheriv('aes-256-cbc', decodeKey, iv);\n    return cipher.update(JSON.stringify(data || {}), 'utf8', 'base64') + cipher.final('base64');\n  }\n}"
      },
      {
        "id": "facebook-custum-picture",
        "title": "Use a custom sized profile picture for Facebook connections",
        "summary": "By using this rule you can enrich the profile with facebook profile picture.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule will set the <code>picture</code> to a custom size for users who login with Facebook.</p>\n",
        "code": "function (user, context, callback) {\n  if (context.connection === 'facebook') {\n    var fbIdentity = _.find(user.identities, { connection: 'facebook' });\n    // See: https://developers.facebook.com/docs/graph-api/reference/user/picture/ for more\n    // sizes and types of images that can be returned\n    var pictureType = 'large';\n    user.picture = 'https://graph.facebook.com/v2.5/' + fbIdentity.user_id + '/picture?type=' + pictureType;\n  }\n  callback(null, user, context);\n}"
      },
      {
        "id": "get-FullContact-profile",
        "title": "Enrich profile with FullContact",
        "summary": "By using this rule you can enrich the profile with information from FullContact.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule gets the user profile from FullContact using the e-mail (if available). If the information is immediately available (signaled by a <code>statusCode=200</code>), it adds a new property <code>fullContactInfo</code> to the user_metadata and returns. Any other conditions are ignored. See <a href=\"http://www.fullcontact.com/developer/docs/\">FullContact docs</a> for full details.</p>\n",
        "code": "function (user, context, callback) {\n  var FULLCONTACT_KEY = 'YOUR FULLCONTACT API KEY';\n  var SLACK_HOOK = 'YOUR SLACK HOOK URL';\n\n  var slack = require('slack-notify')(SLACK_HOOK);\n\n  // skip if no email\n  if(!user.email) return callback(null, user, context);\n  // skip if fullcontact metadata is already there\n  if(user.user_metadata && user.user_metadata.fullcontact) return callback(null, user, context);\n  request({\n    url: 'https://api.fullcontact.com/v2/person.json',\n    qs: {\n      email:  user.email,\n      apiKey: FULLCONTACT_KEY\n    }\n  }, function (error, response, body) {\n    if (error || (response && response.statusCode !== 200)) {\n\n      slack.alert({\n        channel: '#slack_channel',\n        text: 'Fullcontact API Error',\n        fields: {\n          error: error ? error.toString() : (response ? response.statusCode + ' ' + body : '')\n        }\n      });\n\n      // swallow fullcontact api errors and just continue login\n      return callback(null, user, context);\n    }\n\n\n    // if we reach here, it means fullcontact returned info and we'll add it to the metadata\n    user.user_metadata = user.user_metadata || {};\n    user.user_metadata.fullcontact = JSON.parse(body);\n\n    auth0.users.updateUserMetadata(user.user_id, user.user_metadata);\n    return callback(null, user, context);\n  });\n}"
      },
      {
        "id": "get-getIP",
        "title": "Enrich profile with the locations where the user logs in",
        "summary": "By using this rule you can enrich the profile with the location of the user.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule gets the user locations based on the IP and is added to the app_metadata in the <code>geoip</code> attribute.</p>\n",
        "code": "function (user, context, callback) {\n\n  user.user_metadata = user.user_metadata || {};\n\n  user.user_metadata.geoip = context.request.geoip;\n\n  auth0.users.updateUserMetadata(user.user_id, user.user_metadata)\n    .then(function(){\n      callback(null, user, context);\n    })\n    .catch(function(err){\n      callback(err);\n    });\n}"
      },
      {
        "id": "get-rapLeaf-profile",
        "title": "Enrich profile with Rapleaf",
        "summary": "By using this rule you can enrich the profile with information from rapLeaf.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule gets user information from <strong>rapleaf</strong> using the e-mail (if available). If the information is immediately available (signaled by a <code>statusCode=200</code>), it adds a new property <code>rapLeafInfo</code> to the user profile and returns. Any other conditions are ignored. See <a href=\"http://www.rapleaf.com/developers/personalization-api/\">RapLeaf docs</a> for full details.</p>\n",
        "code": "function (user, context, callback) {\n\n  //Filter by app\n  //if(context.clientName !== 'AN APP') return callback(null, user, context);\n\n  var rapLeafAPIKey = 'YOUR RAPLEAF API KEY';\n\n  if(user.email){\n    return callback(null, user, context);\n  }\n\n  request({\n    url: 'https://personalize.rapleaf.com/v4/dr',\n    qs: {\n      email: user.email,\n      api_key: rapLeafAPIKey\n    }\n  }, function(err, response, body){\n    if(err) return callback(err);\n\n    if(response.statusCode===200){\n     user.rapLeafData = JSON.parse(body);\n    }\n\n    return callback(null, user, context);\n  });\n\n}"
      },
      {
        "id": "get-twitter-email",
        "title": "Get email address from Twitter",
        "summary": "By using this rule you can enrich the profile with the email address obtained from twitter.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>NOTE: For this rule to work, your Twitter application must be whitelisted to access email addresses.</p>\n<p>This rule will not perist the returned email to the Auth0 user profile, but it will be returned to your application.\nIf you want to persist the email, it will need to be <a href=\"https://auth0.com/docs/rules/metadata-in-rules#updating-app_metadata\">done with <code>app_metadata</code> as described here</a>.\nFor example, you can save it under <code>app_metadata.social_email</code>.</p>\n<p>When accessing the email, you can do the following from a rule or the equivalent in your application:</p>\n<p>The rule which makes the call to Twitter to retrieve the email is as follows:</p>\n",
        "code": "user.app_metadata = user.app_metadata || {};\nvar email = user.email || user.app_metadata.social_email;"
      },
      {
        "id": "google-refresh-token",
        "title": "Store Google Refresh Token",
        "summary": "By using this rule you can enrich the profile with a google refresh token.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>In some scenarios, you might want to access Google APIs from your application. You do that by using the <code>access_token</code> stored on the <code>identities</code> array (<code>user.identities[0].access_token</code>). However <code>access_token</code>s have an expiration and in order to get a new one, you have to ask the user to login again. That&#39;s why Google allows asking for a <code>refresh_token</code> that can be used forever (until the user revokes it) to obtain new <code>access_tokens</code> without requiring the user to relogin.</p>\n<p>The way you ask for a <code>refresh_token</code> using Lock is by sending the <code>access_type=offline</code> as an extra parameter as <a href=\"https://github.com/auth0/lock/wiki/Sending-authentication-parameters\">explained here</a>.</p>\n<p>The only caveat is that Google will send you the <code>refresh_token</code> only once, and if you haven&#39;t stored it, you will have to ask for it again and add <code>approval_prompt=force</code> so the user explicitly consent again. Since this would be annoying from a user experience perspective, you should store the refresh token on Auth0 as a persistent property of the user, only if it there is a new one available.</p>\n",
        "code": "function (user, context, callback) {\n  user.app_metadata = user.app_metadata || {};\n  // IMPORTANT: for greater security, we recommend encrypting this value and decrypt on your application.\n  // function encryptAesSha256 (password, textToEncrypt) {\n  //   var cipher = crypto.createCipher('aes-256-cbc', password);\n  //   var crypted = cipher.update(textToEncrypt, 'utf8', 'hex');\n  //   crypted += cipher.final('hex');\n  //   return crypted;\n  // }\n\n  // if the user that just logged in has a refresh_token, persist it\n  if (user.refresh_token) {\n    user.app_metadata.refresh_token = user.refresh_token;\n    auth0.users.updateAppMetadata(user.user_id, user.app_metadata)\n      .then(function(){\n        callback(null, user, context);\n      })\n      .catch(function(err){\n        callback(err);\n      });\n  } else {\n    callback(null, user, context);\n  }\n}"
      },
      {
        "id": "google-service-account-token",
        "title": "Create a Google access_token using a Service Account",
        "summary": "By using this rule you can enrich the profile with a google refresh token.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>In some scenarios, you might want to access Google Admin APIs from your applications. Accesing those APIs require either a consent of the Google Apps administrator or creating a Service Account and obtain a token programatically without interactive consent. This rule create such token based on a service account and put it under <code>user.admin_access_token</code>.</p>\n<p>To create a service account go to Google API Console, create a new Client ID and choose Service Account</p>\n<p><img src=\"https://cloudup.com/cpvhC6n9xW9+\" width=\"420\"></p>\n<p>You will get the key that you would have to convert to PEM and remove the passphrase using this command</p>\n<p>  openssl pkcs12 -in yourkey.p12 -out yourkey.pem -nocerts -nodes</p>\n<p>Login to Google Apps Admin and go to <a href=\"https://admin.google.com/AdminHome?chromeless=1#OGX:ManageOauthClients\">https://admin.google.com/AdminHome?chromeless=1#OGX:ManageOauthClients</a> (Security -&gt; Advanced Settings -&gt; Manage OAuth Client Access)\nEnter</p>\n<p><img src=\"https://cloudup.com/c0Nq5NWRFaQ+\" width=\"620\"></p>\n<p>Enter the Client ID created on the previous step and the scope you want to allow access to.</p>\n<ul>\n<li><code>KEY</code>: the string representation of the key (open the PEM and replace enters with \\n to make it one line).</li>\n<li><code>GOOGLE_CLIENT_ID_EMAIL</code>: this is the email address of the service account created (NOT the Client ID).</li>\n<li><code>SCOPE</code>: the scope you want access to. Full list of scopes <a href=\"https://developers.google.com/admin-sdk/directory/v1/guides/authorizing\">https://developers.google.com/admin-sdk/directory/v1/guides/authorizing</a>.</li>\n<li><code>ADMIN_EMAIL</code>: a user of your Google Apps domain that this rule would impersonate.</li>\n</ul>\n<blockquote>\n<p>NOTE: the Google access_token will last 1 hour, so you will have to either force a re-login or use a refresh token to trigger a token refresh on Auth0 and hence the rule running again.</p>\n<p>NOTE 2: you might want to be careful what scopes you ask for and where the access_token will be used. For instance, if used from a JavaScript application, a low-privilieged user might grab the token and do API calls that you wouldn&#39;t allow.</p>\n</blockquote>\n<p>Here&#39;s the rule:</p>\n",
        "code": "function (user, context, callback) {\n\n  // this is the private key you downloaded from your service account.\n  // make sure you remove the password from the key and convert it to PEM using the following\n  // openssl pkcs12 -in yourkey.p12 -out yourkey.pem -nocerts -nodes\n  // finally, you should put this as a configuration encrypted in Auth0\n  var KEY = '....RSA private key downloaded from service account...';\n\n  // this is the email address of the service account created (NOT the Client ID)\n  var GOOGLE_CLIENT_ID_EMAIL = '.....@developer.gserviceaccount.com';\n\n  // the scope you want access to. Full list of scopes https://developers.google.com/admin-sdk/directory/v1/guides/authorizing\n  var SCOPE = 'https://www.googleapis.com/auth/admin.directory.user.readonly';\n\n  // a user of your Google Apps domain that this rule would impersonate\n  var ADMIN_EMAIL = 'foo@corp.com';\n\n  var token = jwt.sign({ scope: SCOPE, sub: ADMIN_EMAIL }, KEY, { audience: \"https://accounts.google.com/o/oauth2/token\", issuer: GOOGLE_CLIENT_ID_EMAIL, expiresInMinutes: 60, algorithm: 'RS256'});\n\n  request.post({ url: 'https://accounts.google.com/o/oauth2/token', form: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: token } }, function(err, resp, body) {\n    if (err) return callback(null, user, context);\n    var result = JSON.parse(body);\n    if (result.error) {\n      console.log(body);\n      // log and swallow\n      return callback(null, user, context);\n    }\n\n    user.admin_access_token = result.access_token;\n    callback(null, user, context);\n  });\n\n}"
      },
      {
        "id": "linkedin-original-picture",
        "title": "Use the original sized profile picture for LinkedIn connections",
        "summary": "By using this rule you'll be able to enrich the profile with the profile picture retrieved from LinkedIn.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule will set the <code>picture</code> to the original sized profile picture for users who login with LinkedIn.</p>\n",
        "code": "function (user, context, callback) {\n  if (context.connection !== 'linkedin') {\n    callback(null, user, context);\n  }\n\n  var request = require('request');\n  var options = {\n    url: 'https://api.linkedin.com/v1/people/~/picture-urls::(original)?format=json',\n    headers: {\n      Authorization: 'Bearer ' + user.identities[0].access_token\n    }\n  };\n\n  request(options, function(error, response) {\n    if (!error && response.statusCode === 200) {\n      var json = JSON.parse(response.body);\n      if (json.values && json.values.length >= 1) {\n        user.picture = json.values[0];\n      }\n    }\n    callback(null, user, context);\n  });\n}"
      },
      {
        "id": "querystring",
        "title": "Querystring",
        "summary": "By using this rule you can enrich the profile based on querystring parameters.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule shows how to check for variables in the <code>querystring</code>. As an example, the snippet below checks if the login transaction includes a query variable called <code>some_querystring</code> with a value <code>whatever</code> and if it does, it will add an attribute to the user profile.</p>\n<p>An example of typical authorization URL:</p>\n<p><code>https://YOURS.auth0.com/authorize?some_querystring=whatever&amp;client_id=YOUR_CLIENTID&amp;...</code></p>\n<p>The <code>context.request.query</code> object is parsed using the <code>querystring</code> module <a href=\"http://nodejs.org/api/querystring.html\">http://nodejs.org/api/querystring.html</a></p>\n<blockquote>\n<p>Note: this rule works with any protocols supported by Auth0. For example, WS-Fed would be something like: <code>https://YOURS.auth0.com/wsfed?wtrealm=YOUR_APP_REALM&amp;whr=urn:google-oauth2&amp;some_querystring=whatever</code></p>\n</blockquote>\n",
        "code": "function (user, context, callback) {\n  if (context.request.query.some_querystring === 'whatever') {\n     user.new_attribute = 'foo';\n  }\n\n  callback(null, user, context);\n}"
      },
      {
        "id": "remove-attributes",
        "title": "Remove attributes from a user",
        "summary": "By using this rule you can remove some properties from the profile.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>Sometimes you don&#39;t need every attribute from the user. You can use a rule to delete attributes.</p>\n",
        "code": "function (user, context, callback) {\n  delete user.some_attribute;\n\n  // another option would be to define a whitelist of attributes you want,\n  // instead of delete the ones you don't want\n  /*\n  var whitelist = ['email', 'name', 'identities'];\n  Object.keys(user).forEach(function(key) {\n    console.log(whitelist.indexOf(key));\n    if (whitelist.indexOf(key) === -1) delete user[key];\n  });\n  */\n\n  callback(null, user, context);\n}"
      },
      {
        "id": "saml-attribute-mapping",
        "title": "SAML Attributes mapping",
        "summary": "By using this rule you'll be able to map SAML attributes to user profile properties.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>If the application the user is logging in to is SAML (like Salesforce for instance), you can customize the mapping between the Auth0 user and the SAML attributes.\nBelow you can see that we are mapping <code>user_id</code> to the NameID, <code>email</code> to <code>http://schemas.../emailaddress</code>, etc.</p>\n<p>For more information about SAML options, look at <a href=\"https://docs.auth0.com/saml-configuration\">https://docs.auth0.com/saml-configuration</a>.</p>\n",
        "code": "function (user, context, callback) {\n  context.samlConfiguration.mappings = {\n     \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier\": \"user_id\",\n     \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress\":   \"email\",\n     \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name\":           \"name\",\n     \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/food\":           \"user_metadata.favorite_food\",\n     \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/address\":        \"app_metadata.shipping_address\"\n  };\n\n  callback(null, user, context);\n}"
      },
      {
        "id": "soap-webservice",
        "title": "Roles from a SOAP Service",
        "summary": "By using this rule you can enrich the profile with roles obtained from a soap web-service.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule shows how to query a basic profile http binding SOAP web service for roles and add those to the user.</p>\n",
        "code": "function (user, context, callback) {\n  function getRoles(callback) {\n    request.post({\n      url:  'https://somedomain.com/RoleService.svc',\n      body: '<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\"><s:Body><GetRolesForCurrentUser xmlns=\"http://tempuri.org\"/></s:Body></s:Envelope>',\n      headers: { 'Content-Type': 'text/xml; charset=utf-8',\n              'SOAPAction': 'http://tempuri.org/RoleService/GetRolesForCurrentUser' }\n    }, function (err, response, body) {\n      if (err) return callback(err);\n\n      var parser = new xmldom.DOMParser();\n      var doc = parser.parseFromString(body);\n      var roles = xpath.select(\"//*[local-name(.)='string']\", doc).map(function(node) { return node.textContent; });\n      return callback(null, roles);\n    });\n  }\n\n  getRoles(user.email, function(err, roles) {\n    if (err) return callback(err);\n\n    user.roles = roles;\n\n    callback(null, user, context);\n  });\n}"
      },
      {
        "id": "socure_fraudscore",
        "title": "Detect Fraud Users",
        "summary": "By using this rule you can store Socure fraud score in app_metadata.",
        "categories": [
          "enrich profile"
        ],
        "description": "<p>This rule gets the fraud score from socure.com and store it on app_metadata.</p>\n",
        "code": "function (user, context, callback) {\n  // score fraudscore once (if it's already set, skip this)\n  user.app_metadata = user.app_metadata || {};\n  if (user.app_metadata.socure_fraudscore) return callback(null, user, context);\n\n  var SOCURE_KEY = 'YOUR SOCURE API KEY';\n\n  if(!user.email) {\n    // the profile doesn't have email so we can't query their api.\n    return callback(null, user, context);\n  }\n\n  // socurekey=A678hF8E323172B78E9&email=jdoe@acmeinc.com&ipaddress=1.2.3.4&mobilephone=%2B12015550157\n  request({\n    url: 'https://service.socure.com/api/1/EmailAuthScore',\n    qs: {\n      email:  user.email,\n      socurekey: SOCURE_KEY,\n      ipaddress: context.request.ip\n    }\n  }, function (err, resp, body) {\n    if (err) return callback(null, user, context);\n    if (resp.statusCode !== 200) return callback(null, user, context);\n    var socure_response = JSON.parse(body);\n    if (socure_response.status !== 'Ok') return callback(null, user, context);\n\n    user.app_metadata = user.app_metadata || {};\n    user.app_metadata.socure_fraudscore = socure_response.data.fraudscore;\n    user.app_metadata.socure_confidence = socure_response.data.confidence;\n    // \"details\":[  \n    //     \"blacklisted\":{  \n    //        \"industry\":\"Banking and Finance\",\n    //        \"reporteddate\":\"2014-07-02\",\n    //        \"reason\":\"ChargeBack Fraud\"\n    //     }\n    // ]\n    user.app_metadata.socure_details = socure_response.data.details;\n\n    auth0.users.updateAppMetadata(user.user_id, user.app_metadata)\n      .then(function(){\n        callback(null, user, context);\n      })\n      .catch(function(err){\n        callback(null, user, context);\n      });\n  });\n}"
      }
    ]
  },
  {
    "name": "webhook",
    "templates": [
      {
        "id": "aspnet-webapi",
        "title": "Custom webhook with ASPNET WebApi2",
        "summary": "By using this rule you can send information of the user profile to a custom webhook.",
        "categories": [
          "webhook"
        ],
        "description": "<p>This rule shows how to post the variables sent to your Rule a custom webhook in an ASP.NET WebApi application. This is useful for situations where you want to enrich the User&#39;s profile with your internal ID before the JsonWebToken is created, or if you want to seamlessly register new users.</p>\n<p>In this example, we&#39;re going to get the internal UserId for your app, then persist it to the Auth0 UserProfile so we only have to make this request the first time a new user signs in.</p>\n<p>Within the snippet, the &quot;secretToken&quot; is a simple way to ensure that the communication is coming from Auth0. Just type in a random string into the Rule, and then check for that string in your WebApi request.</p>\n<p>In your WebApi code, complete whatever operations are necessary, then call <code>return Json(new { customId = USERSCUSTOMID });</code> to return the required JSON to the Rule.</p>\n<blockquote>\n<p>Note: Be sure to change the URL for the request to your website and controller, and make sure the controller is decorated with the <code>[HttpPost]</code> attribute.</p>\n</blockquote>\n<p>Contributed by Robert McLaws, AdvancedREI.com</p>\n",
        "code": "function (user, context, callback) {\n  user.app_metadata = user.app_metadata || {};\n  if (user.app_metadata.customId) {\n    console.log(\"Found ID!\");\n    return callback(null, user, context);\n  }\n\n  // You should make your requests over SSL to protect your app secrets.\n  request.post({\n    url: 'https://yourwebsite.com/auth0',\n    json: {\n      user: user,\n      context: context,\n      secretToken: \";ojhsajk;h;Kh:Jh\",\n    },\n    timeout: 15000\n  }, function(err, response, body){\n    if (err) return callback(new Error(err));\n    user.app_metadata.customId = body.customId;\n    auth0.users.updateAppMetadata(user.user_id, user.app_metadata)\n      .then(function(){\n        callback(null, user, context);\n      })\n      .catch(function(err){\n        callback(err);\n      });\n  });\n}"
      },
      {
        "id": "creates-lead-salesforce",
        "title": "Creates a new Lead in Salesforce on First Login",
        "summary": "By using this rule you'll be able to create a Lead in Salesforce.",
        "categories": [
          "webhook"
        ],
        "description": "<p>This rule will check if this is the first user login, and in that case will call Salesforce API to record the contact as a new Lead. It is using Salesforce REST APIs and the <code>resource owner</code> flow to obtain an <code>access_token</code>. The username you use to authenticate the API will appear as the <strong>creator</strong> of the lead.</p>\n<blockquote>\n<p>Note: this sample implements very basic error handling.</p>\n</blockquote>\n",
        "code": "function (user, context, done) {\n  user.app_metadata = user.app_metadata || {};\n  if (user.app_metadata.recordedAsLead) {\n    return done(null,user,context);\n  }\n\n  var MY_SLACK_WEBHOOK_URL = 'YOUR SLACK WEBHOOK URL';\n  var slack = require('slack-notify')(MY_SLACK_WEBHOOK_URL);\n\n  //Populate the variables below with appropriate values\n  var SFCOM_CLIENT_ID = configuration.SALESFORCE_CLIENT_ID;\n  var SFCOM_CLIENT_SECRET = configuration.SALESFORCE_CLIENT_SECRET;\n  var USERNAME = configuration.SALESFORCE_USERNAME;\n  var PASSWORD = configuration.SALESFORCE_PASSWORD;\n\n  getAccessToken(SFCOM_CLIENT_ID, SFCOM_CLIENT_SECRET, USERNAME, PASSWORD,\n    function(r) {\n      if (!r.instance_url || !r.access_token) {\n        slack.alert({\n          channel: '#some_channel',\n          text: 'Error Getting SALESFORCE Access Token',\n          fields: {\n            error: r\n          }\n        });\n\n        return;\n      }\n\n      createLead(r.instance_url, r.access_token, function (e, result) {\n        if (!result.id) {\n          slack.alert({\n            channel: '#some_channel',\n            text: 'Error Creating SALESFORCE Lead',\n            fields: {\n              error: result\n            }\n          });\n\n          return;\n        }\n\n        user.app_metadata.recordedAsLead = true;\n        auth0.users.updateAppMetadata(user.user_id, user.app_metadata);\n      });\n    });\n\n  //See http://www.salesforce.com/us/developer/docs/api/Content/sforce_api_objects_lead.htm\n  function createLead(url, access_token, callback){\n    //Can use many more fields\n    var data = {\n      LastName: user.name,\n      Company: 'Web channel signups'\n    };\n\n    request.post({\n      url: url + \"/services/data/v20.0/sobjects/Lead\",\n      headers: {\n        \"Authorization\": \"OAuth \" + access_token\n      },\n      json: data\n      }, function(e,r,b) {\n        return callback(b);\n      });\n  }\n\n  //Obtains a SFCOM access_token with user credentials\n  function getAccessToken(client_id, client_secret, username, password, callback) {\n    request.post({\n      url: 'https://login.salesforce.com/services/oauth2/token',\n      form: {\n        grant_type: 'password',\n        client_id: client_id,\n        client_secret: client_secret,\n        username: username,\n        password: password\n      }}, function(e,r,b) {\n        return callback(JSON.parse(b));\n      });\n  }\n\n  // don’t wait for the SF API call to finish, return right away (the request will continue on the sandbox)`\n  done(null, user, context);\n}"
      },
      {
        "id": "mailgun",
        "title": "Send emails through Mailgun",
        "summary": "By using this rule you can send an email to an administrator on the first login using Mailgun.",
        "categories": [
          "webhook"
        ],
        "description": "<p>This rule will send an email to an administrator on the first login of a user using <a href=\"https://mailgun.com\">Mailgun</a>.</p>\n<p>We use a persistent property <code>SignedUp</code> to track whether this is the first login or subsequent ones.</p>\n",
        "code": "function(user, context, callback) {\n  user.app_metadata = user.app_metadata || {};\n  if (user.app_metadata.signedUp) {\n    return callback(null, user, context);\n  }\n\n  request.post( {\n    url: 'https://api.mailgun.net/v3/{YOUR MAILGUN ACCOUNT}/messages',\n      auth:\n      {\n          user: 'api',\n          pass: '{YOUR MAILGUN KEY}'\n      },\n    form: {\n      'to': 'admin@myapp.com',\n      'subject': 'NEW SIGNUP',\n      'from': 'admin@myapp.com',\n      'text': 'We have got a new sign up from: ' + user.email + '.'\n    }\n  }, function(e,r,b) {\n    if (e) return callback(e);\n    if (r.statusCode !== 200) return callback(new Error('Invalid operation'));\n\n    user.app_metadata.signedUp = true;\n    auth0.users.updateAppMetadata(user.user_id, user.app_metadata)\n    .then(function(){\n      callback(null, user, context);\n    })\n    .catch(function(err){\n      callback(err);\n    });\n  });\n}"
      },
      {
        "id": "mandrill",
        "title": "Send email with Mandrill",
        "summary": "By using this rule you can send an email to an administrator on the first login using Mandrill.",
        "categories": [
          "webhook"
        ],
        "description": "<p>This rule will send an email to an administrator on a user&#39;s first login. We use a persistent <code>signedUp</code> property to track whether this is the case or not. This rule assumes you&#39;ve stored a secure value named <code>MANDRILL_API_KEY</code>, which contains your secret API key for Mandrill. It is sent in each request.</p>\n<p>In the same way, other services such as <a href=\"http://docs.aws.amazon.com/ses/latest/APIReference/Welcome.html\">Amazon SES</a> and <a href=\"sendgrid.md\">SendGrid</a> can be used.</p>\n<p>Make sure to change the sender and destination emails.</p>\n",
        "code": "function (user, context, callback) {\n  user.app_metadata = user.app_metadata || {};\n  // Only send an email when user signs up\n  if (!user.app_metadata.signedUp) {\n    // See https://mandrillapp.com/api/docs/messages.JSON.html#method=send\n    var body = {\n      key: configuration.MANDRILL_API_KEY,\n      message: {\n        subject: 'User ' + user.name + ' signed up to ' + context.clientName,\n        text: 'Sent from an Auth0 rule',\n        from_email: 'SENDER_EMAIL@example.com',\n        from_name: 'Auth0 Rule',\n        to: [\n          {\n            email: 'DESTINATION_EMAIL@example.com',\n            type: 'to'\n          }\n        ],\n      }\n    };\n    var mandrill_send_endpoint = 'https://mandrillapp.com/api/1.0/messages/send.json';\n\n    request.post({url: mandrill_send_endpoint, form: body}, function (err, resp, body) {\n      if (err) { return callback(err); }\n      user.app_metadata.signedUp = true;\n      auth0.users.updateAppMetadata(user.user_id, user.app_metadata)\n        .then(function(){\n          callback(null, user, context);\n        })\n        .catch(function(err){\n          callback(err);\n        });\n    });\n  } else {\n    // User had already logged in before, do nothing\n    callback(null, user, context);\n  }\n}"
      },
      {
        "id": "mixpanel-track-event",
        "title": "Tracks Logins in MixPanel",
        "summary": "By using this rule you can track sign in events in MixPanel.",
        "categories": [
          "webhook"
        ],
        "description": "<p>This rule will send a <code>Sign In</code> event to MixPanel, and will include the application the user is signing in to as a property. See <a href=\"https://mixpanel.com/help/reference/http\">MixPanel HTTP API</a> for more information.</p>\n",
        "code": "function (user, context, callback) {\n\n  var mpEvent = {\n    \"event\": \"Sign In\",\n    \"properties\": {\n        \"distinct_id\": user.user_id,\n        \"token\": \"{REPLACE_WITH_YOUR_MIXPANEL_TOKEN}\",\n        \"application\": context.clientName\n    }\n  };\n\n  var base64Event = new Buffer(JSON.stringify(mpEvent)).toString('base64');\n\n  request.get({\n    url: 'http://api.mixpanel.com/track/',\n    qs: {\n      data: base64Event\n    }\n  }, function (e, r, b){\n      // don’t wait for the MixPanel API call to finish, return right away (the request will continue on the sandbox)`\n      callback(null, user, context);\n  });\n}"
      },
      {
        "id": "pusher",
        "title": "Obtains a Pusher token for subscribing/publishing to private channels",
        "summary": "By using this rule you can generate a [pusher.com] token that can be used to send and receive messages.",
        "categories": [
          "webhook"
        ],
        "description": "<p>This rule will generate a [pusher.com] token that can be used to send and receive messages from private channels. See <a href=\"https://github.com/auth0/auth0-pusher\">a complete example here</a>.</p>\n",
        "code": "function (user, context, callback) {\n\n  var pusherKey='YOUR PUSHER KEY';\n  var pusherSecret = '{YOUR PUSHER SECRET}';\n\n  if( context.request.query.channel && context.request.query.socket_id)\n  {\n    user.pusherAuth = pusherKey + \":\" + sign(pusherSecret, context.request.query.channel, context.request.query.socket_id);\n  }\n\n  callback(null, user, context);\n\n  function sign(secret, channel, socket_id)\n  {\n    var string_to_sign = socket_id+\":\"+channel;\n    var sha = crypto.createHmac('sha256',secret);\n    return sha.update(string_to_sign).digest('hex');\n  }\n}"
      },
      {
        "id": "send-events-keenio",
        "title": "Send events to Keen",
        "summary": "By using this rule you'll be able to track sign up events with Keen IO.",
        "categories": [
          "webhook"
        ],
        "description": "<p>This rule is used to send a <code>signup</code> event to <a href=\"http://keen.io\">Keen IO</a></p>\n<p>The rule checks whether the user has already signed up before or not. This is tracked by the persistent <code>user.signedUp</code> property. If the property is present, everything else is skipped.\nIf not, then we POST a new event with some information to a <code>signups Collection</code> on Keen IO.</p>\n<p>Once enabled, events will be displayed on Keen IO dashboard:\n<img src=\"http://puu.sh/7k4qN.png\" alt=\"\"></p>\n",
        "code": "function(user, context, callback) {\n  if (context.stats.loginsCount > 1) {\n    return callback(null, user, context);\n  }\n\n  var MY_SLACK_WEBHOOK_URL = 'YOUR SLACK WEBHOOK URL';\n  var slack = require('slack-notify')(MY_SLACK_WEBHOOK_URL);\n\n  var writeKey = 'YOUR KEEN IO WRITE KEY';\n  var projectId = 'YOUR KEEN IO PROJECT ID';\n  var eventCollection = 'signups';\n\n  var keenEvent = {\n    userId: user.user_id,\n    name: user.name,\n    ip: context.request.ip //Potentially any other properties in the user profile/context\n  };\n\n  request.post({\n    method: 'POST',\n    url: 'https://api.keen.io/3.0/projects/' + projectId + '/events/' + eventCollection + '?api_key=' + writeKey,\n    headers: {\n      'Content-type': 'application/json',\n    },\n    body: JSON.stringify(keenEvent),\n  },\n  function (error, response, body) {\n\n    if( error || (response && response.statusCode !== 200) ) {\n      slack.alert({\n        channel: '#some_channel',\n        text: 'KEEN API ERROR',\n        fields: {\n          error: error ? error.toString() : (response ? response.statusCode + ' ' + body : '')\n        }\n      });\n    }\n  });\n\n  callback(null, user, context);\n}"
      },
      {
        "id": "sendgrid",
        "title": "Send emails through SendGrid",
        "summary": "By using this rule you can send an email to an administrator on the first login using SendGrid.",
        "categories": [
          "webhook"
        ],
        "description": "<p>This rule will send an email to an administrator on the first login of a user.</p>\n<p>We use a persistent property <code>SignedUp</code> to track whether this is the first login or subsequent ones.</p>\n<p>In the same way you can use other services like <a href=\"http://docs.aws.amazon.com/ses/latest/APIReference/Welcome.html\">Amazon SES</a>, <a href=\"mandrill.md\">Mandrill</a> and few others.</p>\n",
        "code": "function(user, context, callback) {\n  user.app_metadata = user.app_metadata || {};\n  if (!user.app_metadata.signedUp) {\n    return callback(null, user, context);\n  }\n\n  request.post( {\n    url: 'https://api.sendgrid.com/api/mail.send.json',\n    headers: {\n      'Authorization': 'Bearer ...'\n    },\n    form: {\n      'to': 'admin@myapp.com',\n      'subject': 'NEW SIGNUP',\n      'from': 'admin@myapp.com',\n      'text': 'We have got a new sign up from: ' + user.email + '.'\n    }\n  }, function(e,r,b) {\n    if (e) return callback(e);\n    if (r.statusCode !== 200) return callback(new Error('Invalid operation'));\n\n    user.app_metadata.signedUp = true;\n    auth0.users.updateAppMetadata(user.user_id, user.app_metadata)\n    .then(function(){\n      callback(null, user, context);\n    })\n    .catch(function(err){\n      callback(err);\n    });\n  });\n}"
      },
      {
        "id": "slack",
        "title": "Slack Notification on User Signup",
        "summary": "",
        "categories": [
          "webhook"
        ],
        "description": "<p>This rule sends a message to a slack channel on every user signup.</p>\n",
        "code": "function(user, context, callback) {\n  // short-circuit if the user signed up already\n  if (context.stats.loginsCount > 1) return callback(null, user, context);\n\n  // get your slack's hook url from: https://slack.com/services/10525858050\n  var SLACK_HOOK = 'YOUR SLACK HOOK URL';\n\n  var slack = require('slack-notify')(SLACK_HOOK);\n  var message = 'New User: ' + (user.name || user.email) + ' (' + user.email + ')';\n  var channel = '#some_channel';\n\n  slack.success({\n   text: message,\n   channel: channel\n  });\n\n  // don’t wait for the Slack API call to finish, return right away (the request will continue on the sandbox)`\n  callback(null, user, context);\n}"
      },
      {
        "id": "splunk-track-event",
        "title": "Tracks Logins/SignUps with Splunk",
        "summary": "By using this rule you'll be able to track sign up events with Splunk.",
        "categories": [
          "webhook"
        ],
        "description": "<p>This rule will send a <code>SignUp</code> &amp; <code>Login</code> events to Splunk, including some contextual information of the user: the application the user is signing in, client IP address, username, etc.</p>\n<p>We use a persistent property <code>SignedUp</code> to track whether this is the first login or subsequent ones.</p>\n<p>Events will show up on the Splunk console shortly after user access:</p>\n<p><img src=\"http://puu.sh/7R1EW.png\" alt=\"\"></p>\n",
        "code": "function(user, context, callback) {\n  user.app_metadata = user.app_metadata || {};\n  var splunkBaseUrl = 'YOUR SPLUNK SERVER, like: https://your server:8089';\n\n  //Add any interesting info to the event\n  var event = {\n    message: user.app_metadata.signedUp ? 'Login' : 'SignUp',\n    application: context.clientName,\n    clientIP: context.request.ip,\n    protocol: context.protocol,\n    userName: user.name,\n    userId: user.user_id\n  };\n\n  request.post( {\n    url: splunkBaseUrl + '/services/receivers/simple',\n    auth: {\n        'user': 'YOUR SPLUNK USER',\n        'pass': 'YOUR SPLUNK PASSWORD',\n      },\n    json: event,\n    qs: {\n      'source': 'auth0',\n      'sourcetype': 'auth0_activity'\n    }\n  }, function(e,r,b) {\n    if (e) return callback(e);\n    if (r.statusCode !== 200) return callback(new Error('Invalid operation'));\n    user.app_metadata.signedUp = true;\n    auth0.users.updateAppMetadata(user.user_id, user.app_metadata)\n    .then(function(){\n      callback(null, user, context);\n    })\n    .catch(function(err){\n      callback(err);\n    });\n  });\n\n}"
      },
      {
        "id": "update-firebase-user",
        "title": "Update user profile identity in Firebase",
        "summary": "",
        "categories": [
          "webhook"
        ],
        "description": "<p>This rule is used to create or update identity information for a user profile\nstored in Firebase using the Firebase REST API. The unique <code>user.user_id</code> is\nbase64 encoded to provide a unique generated key for the user.</p>\n<p>Each time the user logs into the system, properties of their user\nprofile can updated in Firebase to keep identity properties (like\nname, email, etc) in sync with authentication credentials.</p>\n<p>You can find more information in the Firebase API: <a href=\"https://www.firebase.com/docs/rest-api.html\">REST API</a></p>\n",
        "code": "function (user, context, callback) {\n\n  var baseURL = configuration.FIREBASE_URL;\n  var secret = configuration.FIREBASE_SECRET;\n  var fb_id = new Buffer(user.user_id).toString('base64');\n\n  var fbIdentity = {\n    \"identity\": {\n      \"user_id\": user.user_id,\n      \"email\": user.email,\n      \"name\": user.name,\n      \"nickname\": user.nickname,\n      \"picture\": user.picture\n    }\n  };\n\n  var putURL = baseURL + \"/users/\" + fb_id + \".json?auth=\" + secret;\n  request.put({\n    \"url\": putURL,\n    \"json\": fbIdentity\n  },\n  function(err, response, body) {\n    if (err) return callback(err);\n    return callback(null, user, context);\n  });\n}"
      },
      {
        "id": "zapier-new-login",
        "title": "Trigger a Zap on Every User Login",
        "summary": "By using this rule you'll be able to trigger a Zap on every log in.",
        "categories": [
          "webhook"
        ],
        "description": "<p><strong>What is Zapier?</strong> <a href=\"http://zapier.com\">Zapier</a> is a tool for primarily non-technical users to connect together web apps. An integration between two apps is called a Zap. A Zap is made up of a Trigger and an Action. Whenever the trigger happens in one app, Zapier will automatically perform the action in another app.</p>\n<p><img src=\"https://cloudup.com/iGyywQuJqIb+\" alt=\"\"></p>\n<p>This rule will call Zapier static hook every time a user logs in.</p>\n",
        "code": "function (user, context, callback) {\n  var ZAP_HOOK_URL = 'REPLACE_ME';\n\n  var small_context = {\n    appName: context.clientName,\n    userAgent: context.userAgent,\n    ip: context.ip,\n    connection: context.connection,\n    strategy: context.connectionStrategy\n  };\n  var payload_to_zap = extend({}, user, small_context);\n  request.post({\n    url: ZAP_HOOK_URL,\n    json: payload_to_zap\n  },\n  function (err, response, body) {\n    // swallow error\n    callback(null, user, context);\n  });\n\n  function extend(target) {\n    for (var i = 1; i < arguments.length; i++) {\n      var source = arguments[i],\n          keys = Object.keys(source);\n\n      for (var j = 0; j < keys.length; j++) {\n          var name = keys[j];\n          target[name] = source[name];\n      }\n    }\n    return target;\n  }\n}"
      },
      {
        "id": "zapier-new-user",
        "title": "Trigger a Zap on New Users",
        "summary": "By using this rule you'll be able to trigger a Zap on every sign up.",
        "categories": [
          "webhook"
        ],
        "description": "<p><strong>What is Zapier?</strong> <a href=\"http://zapier.com\">Zapier</a> is a tool for primarily non-technical users to connect together web apps. An integration between two apps is called a Zap. A Zap is made up of a Trigger and an Action. Whenever the trigger happens in one app, Zapier will automatically perform the action in another app.</p>\n<p><img src=\"https://cloudup.com/cgwZds8MjA7+\" alt=\"\"></p>\n<p>This rule will call Zapier static hook every time a new user signs up.</p>\n",
        "code": "function (user, context, callback) {\n  // short-circuit if the user signed up already\n  if (context.stats.loginsCount > 1) {\n    return callback(null, user, context);\n  }\n\n  var _ = require('lodash');\n\n  var ZAP_HOOK_URL = 'REPLACE_ME';\n\n  var small_context = {\n    appName: context.clientName,\n    userAgent: context.userAgent,\n    ip: context.ip,\n    connection: context.connection,\n    strategy: context.connectionStrategy\n  };\n\n  var payload_to_zap = _.extend({}, user, small_context);\n\n  request.post({\n    url: ZAP_HOOK_URL,\n    json: payload_to_zap\n  });\n\n  // don’t wait for the Zapier WebHook call to finish, return right away (the request will continue on the sandbox)`\n  callback(null, user, context);\n}"
      }
    ]
  },
  {
    "name": "multifactor",
    "templates": [
      {
        "id": "duo-multifactor",
        "title": "Multifactor with Duo Security",
        "summary": "By using this rule you'll be able to trigger multifactor authentication with Duo Security.",
        "categories": [
          "multifactor"
        ],
        "description": "<p>This rule is used to trigger multifactor authentication with <a href=\"http://duosecurity.com\">Duo Security</a> when a condition is met.</p>\n<p>Upon first login, the user can enroll the device.</p>\n<p>You need to create two <strong>integrations</strong> in <strong>Duo Security</strong>: one of type <strong>WebSDK</strong> and the other <strong>Admin SDK</strong>.</p>\n",
        "code": "function (user, context, callback) {\n\n  var CLIENTS_WITH_MFA = ['{REPLACE_WITH_YOUR_CLIENT_ID}'];\n  // run only for the specified clients\n  if (CLIENTS_WITH_MFA.indexOf(context.clientID) !== -1) {\n    // uncomment the following if clause in case you want to request a second factor only from user's that have user_metadata.use_mfa === true\n    // if (user.user_metadata && user.user_metadata.use_mfa){\n      context.multifactor = {\n        //required\n        provider: 'duo',\n        ikey: 'DIXBMN...LZO8IOS8',\n        skey: 'nZLxq8GK7....saKCOLPnh',\n        host: 'api-3....049.duosecurity.com',\n\n        // optional. Force DuoSecurity everytime this rule runs. Defaults to false. if accepted by users the cookie lasts for 30 days (this cannot be changed)\n        // ignoreCookie: true,\n\n        // optional. Use some attribute of the profile as the username in DuoSecurity. This is also useful if you already have your users enrolled in Duo.\n        // username: user.nickname,\n\n        // optional. Admin credentials. If you provide an Admin SDK type of credentials. auth0 will update the realname and email in DuoSecurity.\n        // admin: {\n        //  ikey: 'DIAN...NV6UM',\n        //  skey: 'YL8OVzvoeeh...I1uiYrKoHvuzHnSRj'\n        // },\n      };\n    // }\n  }\n\n  callback(null, user, context);\n}"
      },
      {
        "id": "google-multifactor",
        "title": "Multifactor with Google Authenticator",
        "summary": "By using this rule you'll be able to trigger multifactor authentication with Google Authenticator.",
        "categories": [
          "multifactor"
        ],
        "description": "<p>This rule is used to trigger multifactor authentication with Google Authenticator when a condition is met.</p>\n<p>Upon first login, the user can enroll the device by scanning a QR code. Subsequent logins will ask for the Google Authenticator code.</p>\n<p>To reset Google Authenticator for a user, you can go to Users, search for the specific user and click on Actions -&gt; Multifactor.</p>\n",
        "code": "function (user, context, callback) {\n  // Uncomment the following to skip MFA when impersonating a user\n  // if (user.impersonated) { return callback(null, user, context); }\n\n  var CLIENTS_WITH_MFA = ['REPLACE_WITH_YOUR_CLIENT_ID'];\n  // run only for the specified clients\n  if (CLIENTS_WITH_MFA.indexOf(context.clientID) !== -1) {\n    // uncomment the following if clause in case you want to request a second factor only from users that have app_metadata.use_mfa === true\n    // if (user.app_metadata && user.app_metadata.use_mfa){\n      context.multifactor = {\n        provider: 'google-authenticator',\n        // issuer: 'Label on Google Authenticator App', // optional\n        // key: '{YOUR_KEY_HERE}', //  optional, the key to use for TOTP. by default one is generated for you\n        // ignoreCookie: true // optional, force Google Authenticator everytime this rule runs. Defaults to false. if accepted by users the cookie lasts for 30 days (this cannot be changed)\n      };\n    // }\n  }\n\n  callback(null, user, context);\n}"
      },
      {
        "id": "guardian-multifactor",
        "title": "Multifactor with Auth0 Guardian",
        "summary": "By using this rule you'll be able to trigger multifactor authentication with Auth0 Guardian.",
        "categories": [
          "multifactor"
        ],
        "description": "<p>This rule is used to trigger multifactor authentication with Auth0 when a condition is met.</p>\n<p>Upon first login, the user can enroll the device.</p>\n",
        "code": "function (user, context, callback) {\n\n  //var CLIENTS_WITH_MFA = ['{REPLACE_WITH_YOUR_CLIENT_ID}'];\n  // run only for the specified clients\n  // if (CLIENTS_WITH_MFA.indexOf(context.clientID) !== -1) {\n    // uncomment the following if clause in case you want to request a second factor only from user's that have user_metadata.use_mfa === true\n    // if (user.user_metadata && user.user_metadata.use_mfa){\n      context.multifactor = {\n        provider: 'guardian', //required\n\n        // ignoreCookie: true, // optional. Force Auth0 MFA everytime this rule runs. Defaults to false. if accepted by users the cookie lasts for 30 days (this cannot be changed)\n      };\n    // }\n  //}\n\n  callback(null, user, context);\n}"
      }
    ]
  },
  {
    "name": "debugging",
    "templates": [
      {
        "id": "requestbin",
        "title": "Dump rule variables to RequestBin",
        "summary": "By using this rule you can dump all rule variables to RequestBin.",
        "categories": [
          "debugging"
        ],
        "description": "<p>This rule shows how to post the variables sent to your Rule to <a href=\"http://RequestB.in\">http://RequestB.in</a> to help troubleshoot issues with your Rules.</p>\n<p>You can run this rule by itself, or paste it into an existing rule. Once the rule has posted data to RequestB.in, you can use a site like <a href=\"http://bodurov.com/JsonFormatter/\">http://bodurov.com/JsonFormatter/</a> to more easily visualize the data.</p>\n<blockquote>\n<p>Note: You should deactivate this rule or comment out the code once you are finished troubleshooting.</p>\n</blockquote>\n<p>Contributed by Robert McLaws, AdvancedREI.com</p>\n",
        "code": "function (user, context, callback) {\n  request.post({\n    url: 'http://requestb.in/YourBinUrl',\n    json: {\n      user: user,\n      context: context,\n    },\n    timeout: 15000\n  }, function(err, response, body){\n    if (err) return callback(new Error(err));\n    return callback(null, user, context);\n  });\n}"
      }
    ]
  },
  {
    "name": "saml",
    "templates": [
      {
        "id": "saml-configuration",
        "title": "Change your SAML configuration",
        "summary": "By using this rule you'll be able to change your SAML configuration.",
        "categories": [
          "saml"
        ],
        "description": "<p>At some point you may want to add fields to your SAML Configuration. The way to do this is to add specific fields as done in the example code snippet below. <code>samlConfiguration</code> is an object that controls the behavior of the SAML and WS-Fed endpoints. Useful for advanced claims mapping and token enrichment (only available for SAMLP and WS-Fed protocol).</p>\n<p>To know more about SAML configuration options check <a href=\"https://auth0.com/docs/saml-configuration#configuration-options\">this documentation page</a>.</p>\n",
        "code": "function (user, context, callback) {\n  if (context.clientID !== '{YOUR_SAMLP_OR_WSFED_CLIENT_ID}') return callback(null, user, context);\n\n  context.samlConfiguration = context.samlConfiguration || {};\n  //context.samlConfiguration.audience = \"urn:foo\";\n  //context.samlConfiguration.recipient = \"http://foo\";\n  //context.samlConfiguration.destination = \"http://foo\";\n  //context.samlConfiguration.lifetimeInSeconds = 3600;\n  //context.samlConfiguration.mappings = {\n  //   \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier\":     \"user_id\",\n  //   \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress\":       \"email\",\n  //   \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name\":        \"name\",\n  //   \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname\":  \"given_name\",\n  //   \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname\": \"family_name\",\n  //   \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn\":         \"upn\",\n  //   \"http://schemas.xmlsoap.org/claims/Group\":      \"groups\"\n  // };\n  //context.samlConfiguration.nameIdentifierFormat = \"urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified\";\n  //context.samlConfiguration.nameIdentifierProbes = [\n  //   \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier\",\n  //   \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress\",\n  //   \"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name\",\n  // ];\n  //context.samlConfiguration.signatureAlgorithm = \"rsa-sha1\";\n  //context.samlConfiguration.digestAlgorithm = \"sha1\";\n  //context.samlConfiguration.signResponse = false;\n  //context.samlConfiguration.authnContextClassRef = \"urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified\";\n  //context.samlConfiguration.mapIdentities = false;\n  //context.samlConfiguration.mapUnknownClaimsAsIs = false;\n  //context.samlConfiguration.passthroughClaimsWithNoMapping = true;\n  //context.samlConfiguration.createUpnClaim = true;\n  //context.samlConfiguration.logout = {\n  //   \"callback\": \"http://foo/logout\"\n  // }\n\n  //context.samlConfiguration.RelayState = \"foo=bar\"; // SAMLP protocol only\n  //context.samlConfiguration.wctx = \"foo=bar\"; // WS-Fed protocol only\n\n  callback(null, user, context);\n}"
      }
    ]
  }
]
