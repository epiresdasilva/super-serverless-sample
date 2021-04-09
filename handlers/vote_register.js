'use strict';

var AWS = require("aws-sdk");
var uuid = require('uuid');

module.exports.main = async (event, context) => {
  let savedVotes = [];

  let body = event.detail;
  let user = body.user;
  let year = body.year;
  let round = body.round;
  let vote = body.vote;

  let voteBag = {
    "id": uuid.v4(),
    "year": year,
    "round": round,
    "vote": vote
  }
  await addVote(voteBag);

  return voteBag;
};

function addVote(voteItem) {
  return new Promise((resolve, reject) => {
    var docClient = new AWS.DynamoDB.DocumentClient();
    var table = process.env.VOTE_TABLE;
  
    var params = {
      TableName:table,
      Item:voteItem
    };
  
    console.log("Adding new item", voteItem);
    docClient.put(params, function(err, data) {
      if (err) {
        console.log("Rejected item", voteItem);
        reject(err);
      } else {
        console.log("Resolved item", voteItem);
        resolve(data);
      }
    });
  });
}
