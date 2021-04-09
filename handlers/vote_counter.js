'use strict';

var AWS = require("aws-sdk");
const { Pool, Client } = require('pg');
const pool = new Pool({
  host: process.env.RDS_ENDPOINT,
  user: 'vote_analytics',
  database: 'vote_analytics',
  password: 'vote_analytics',
  port: 5432,
});

module.exports.main = async (event, context) => {
  console.log("Payload:", event);  

  const client = await pool.connect()

  console.log("connected to the database");

  const voteCount = new Map();
  for (const record of event.Records) {
    let body = JSON.parse(record.body);
    let voteBag = body.responsePayload;
    let vote = voteBag.vote;

    let count = voteCount.has(vote) ? voteCount.get(vote) : 0;
    voteCount.set(vote, count+1);
  }

  try {
    await client.query('BEGIN')
    for (const key of voteCount.keys()) {
      console.log("Key:", key);
      const text = 'INSERT INTO vote_bag_count(name, vote_count, saved_at) VALUES ($1, $2, current_timestamp)';
      const values = [key, voteCount.get(key)];
      const res = await client.query(text, values);
      console.log(res);
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return event;
};