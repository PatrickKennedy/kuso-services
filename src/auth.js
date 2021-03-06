const debug = require('debug')('kuso:index')
    , fs = require('fs')

    , express = require('express')
    , google = require('googleapis')
    , GoogleAuth = require('google-auth-library')

    , config = require('../config')
    , router = express.Router()

    // If modifying these scopes, delete your previously saved credentials
    // at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
    , SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
    , TOKEN_DIR = (
        process.env.HOME ||
        process.env.USERPROFILE ||
        process.env.HOMEPATH
      ) + '/.credentials/'
    , TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json'
    ;

/**
 * @desc: initialize the oauth2 client and move on
 */
let init_auth_client = exports.init_auth_client = (req, res, next) => {
  let clientSecret = config.google_apis.client_secret
    , clientId = config.google_apis.client_id
    , redirectUrl = config.google_apis.redirect_uris[0]
    , auth = new GoogleAuth()
    , oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)
    ;

  res.locals.auth = oauth2Client;
  next();
};


/**
 * @desc: checks that the token for the Google Sheets API exists
 */
let check_auth = exports.check_auth = (req, res, next) => {
  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err)
      return res.redirect("/auth");

    res.locals.auth.credentials = JSON.parse(token);
    next();
  });
};

exports.router = router;
router.route('/')
  /**
   * @swagger
   * /auth/:
   *  get:
   *    description: Generates an auth_url to visit to generate an auth token
   *    produces:
   *      - application/json
   *    responses:
   *      200:
   *        description: a json response containing the auth_url to follow
   */
  .get(init_auth_client, (req, res, next) => {
    let auth_url = res.locals.auth.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    res.json({
      status: 'success',
      message: "Please visit the auth_url to retrieve an auth code",
      data: {
        auth_url: auth_url,
      }
    });
  })

  /**
   * @swagger
   * /auth/:
   *  post:
   *    description: Consumes the token generated by the oauth endpoint
   *    produces:
   *      - application/json
   *    responses:
   *      200:
   *        description: The token has been successfully stored
   *      500:
   *        description: An error occured while generating the token
   */
  .post(init_auth_client, (req, res, next) => {
    let handle_token = (err, token) => {
      if (err)
        return res.status(500)
          .json({
            status: 'error',
            message: "Error while trying to retrieve access token",
            data: err
          });

      store_token(token);
      res.json({
        status: 'success',
        message: "Token cached on file system",
      });
    };

    res.locals.auth.getToken(req.body.code, handle_token);
  });

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function store_token(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  debug('Token stored to ' + TOKEN_PATH);
}
