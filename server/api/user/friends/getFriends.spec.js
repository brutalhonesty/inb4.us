'use strict';

var should = require('should');
var bcrypt = require('bcrypt');
var request = require('supertest');
var uuid = require('node-uuid');
var app = require('../../../app');
var db = require('../../../components/database');
var userSchema = require('../../../components/schema/user');
var users = db.user;
users.initialize();
var utils = db.utils;
utils.initialize();

var cookie;

describe('GET /api/user/friends', function() {

  beforeEach(function (done) {
    var friendId = uuid.v4();
    userSchema._id = friendId;
    userSchema.password = bcrypt.hashSync('mockpassword', 10);
    userSchema.username = 'mockfriend';
    userSchema.email = 'mockfriend@inb4.us';
    userSchema.active = true;
    utils.insert(utils.users, friendId, userSchema, function (error) {
      if(error) {
        return done(error);
      }
      var adminId = uuid.v4();
      userSchema._id = adminId;
      userSchema.password = bcrypt.hashSync('mockpassword', 10);
      userSchema.username = 'mockadmin';
      userSchema.email = 'mockadmin@inb4.us';
      userSchema.active = true;
      utils.insert(utils.users, adminId, userSchema, function (error) {
        if(error) {
          return done(error);
        }
        var userId = uuid.v4();
        userSchema._id = userId;
        userSchema.password = bcrypt.hashSync('mockpassword', 10);
        userSchema.username = 'mockuser';
        userSchema.email = 'mockuser@inb4.us';
        userSchema.active = true;
        userSchema.friends = [{
          id: adminId,
          accepted: true
        }, {
          id: friendId,
          accepted: true
        }];
        utils.insert(utils.users, userId, userSchema, function (error) {
          if(error) {
            return done(error);
          }
          request(app)
          .post('/api/user/login')
          .send({
            username: 'mockuser',
            password: 'mockpassword'
          })
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            cookie = res.headers['set-cookie'];
            res.body.should.be.instanceof(Object);
            res.body.should.have.property('message');
            done();
          });
        });
      });
    });
  });

  afterEach(function (done) {
    users.getAll(function (error, reply) {
      if(error) {
        return done(error);
      }
      var docs = reply.rows.map(function (row) {
        row.value._deleted = true;
        return row.value;
      });
      users.bulk(docs, function (error) {
        if(error) {
          return done(error);
        }
        users.compact(function (error) {
          if(error) {
            return done(error);
          }
          done();
        });
      });
    });
  });

  it('should successfully get the friends list', function(done) {
    request(app)
    .get('/api/user/friends')
    .set('cookie', cookie)
    .expect(200)
    .expect('Content-Type', /json/)
    .end(function(err, res) {
      if (err) {
        return done(err);
      }
      res.body.should.be.instanceof(Object);
      res.body.should.have.property('message');
      res.body.should.have.property('results');
      res.body.results.should.be.length(2);
      done();
    });
  });

  it('should successfully get the friends list based on the incoming username', function(done) {
    request(app)
    .get('/api/user/friends?username=mockuser')
    .expect(200)
    .expect('Content-Type', /json/)
    .end(function(err, res) {
      if (err) {
        return done(err);
      }
      res.body.should.be.instanceof(Object);
      res.body.should.have.property('message');
      res.body.should.have.property('results');
      res.body.results.should.be.length(2);
      done();
    });
  });

  it('should successfully get the an empty friends list', function(done) {
    users.searchByUsername('mockuser', function (error, reply) {
      if(error) {
        return done(error);
      }
      var user = reply.rows[0].value;
      user.friends = [];
      utils.insert(utils.users, user._id, user, function (error) {
        if(error) {
          return done(error);
        }
        request(app)
        .get('/api/user/friends')
        .set('cookie', cookie)
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          res.body.should.be.instanceof(Object);
          res.body.should.have.property('message');
          res.body.should.have.property('results');
          res.body.results.should.be.length(0);
          done();
        });
      });
    });
  });

  it('should fail when the username is missing', function(done) {
    request(app)
    .get('/api/user/friends')
    .expect(400)
    .expect('Content-Type', /json/)
    .end(function(err, res) {
      if (err) {
        return done(err);
      }
      res.body.should.be.instanceof(Object);
      res.body.should.have.property('message');
      done();
    });
  });

  it('should fail when the user does not exist', function(done) {
    users.deleteByUsername('mockuser', function (error, reply) {
      if(error) {
        return done(error);
      }
      request(app)
      .get('/api/user/friends')
      .set('cookie', cookie)
      .expect(400)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        res.body.should.be.instanceof(Object);
        res.body.should.have.property('message');
        done();
      });
    });
  });

  it('should fail on an unactivated account', function(done) {
    users.searchByUsername('mockuser', function (error, reply) {
      if(error) {
        return done(error);
      }
      var user = reply.rows[0].value;
      user.active = false;
      utils.insert(utils.users, user._id, user, function (error) {
        if(error) {
          return done(error);
        }
        request(app)
        .get('/api/user/friends')
        .set('cookie', cookie)
        .expect(400)
        .expect('Content-Type', /json/)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          res.body.should.be.instanceof(Object);
          res.body.should.have.property('message');
          done();
        });
      });
    });
  });
});