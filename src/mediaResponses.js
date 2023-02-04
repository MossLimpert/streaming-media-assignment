const fs = require('fs');
const path = require('path');

const getParty = (request, response) => {
  const file = path.resolve(__dirname, '../client/party.mp4');
  fs.stat(file, (err, stats) => {
    if (err) {
      // if the video is end entry, its not there
      if (err.code === 'ENDENT') {
        response.writeHead(404);
      }
      return response.end(err);
    }
    // check for a range header
    // if we've gone off the edge reset to 0
    // return file after giving 416 (range not satisfyiable) error
    let { range } = request.headers; // destructuring assignment

    // requests to stream media ask for the size of the buffer for file
    // as it streams or user scrubs through the file, new requests made
    // we only send the bytes requested and only if they are valid
    if (!range) {
      range = 'bytes=0-';
    }

    // example thing beginning --> 0000-0001 <-- end
    const positions = range.replace(/bytes=/, '').split('-');

    // turn the starting position into an int
    let start = parseInt(positions[0], 10);

    // size of the file in bytes
    const total = stats.size;
    const end = positions[1] ? parseInt(positions[1], 10) : total - 1;

    // if the start range is bigger than the end range, we need to reset it
    if (start > end) {
      start = end - 1;
    }

    // determine how big a chunk to send back to the client
    // streaming files use 206 success code (partial content)
    const chunksize = (end - start) + 1;

    // write header for the response
    response.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`, // how much we are sending out of total
      'Accept-Ranges': 'bytes', // what data form to expect the range in
      'Content-Length': chunksize, // how big this chunk is in bytes
      'Content-Type': 'video/mp4', // the encoding type
    });

    // create a filestream
    const stream = fs.createReadStream(file, { start, end });

    // open the stream and connect it with our response
    stream.on('open', () => {
      stream.pipe(response);
    });

    // if an error happens (running out of bytes) end response and return stream error
    stream.on('error', (streamErr) => {
      response.end(streamErr);
    });

    return stream;
  });
};

// include file extension
const getVideo = (request, response, fileName) => {
  const file = path.resolve(__dirname, `../client/${fileName}`);
  // check file statistics, and use them to make the response
  fs.stat(file, (err, stats) => {
    if (err) {
      if (err.code === 'ENDENT') {
        response.writeHead(404);
      }
      return response.end(err);
    }

    // get the range
    let { range } = request.headers;
    if (!range) {
      range = 'bytes=0-';
    }
    // turn the range into positions
    const positions = range.replace(/bytes=/, '').split('-');
    let start = parseInt(positions[0], 10);
    const total = stats.size;
    const end = positions[1] ? parseInt(positions[1], 10) : total - 1;
    if (start > end) {
      start = end - 1;
    }
    const chunksize = (end - start) + 1;

    // write response and open stream
    response.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`, // how much we are sending out of total
      'Accept-Ranges': 'bytes', // what data form to expect the range in
      'Content-Length': chunksize, // how big this chunk is in bytes
      'Content-Type': 'video/mp4', // the encoding type
    });
    const stream = fs.createReadStream(file, { start, end });
    stream.on('open', () => {
      stream.pipe(response);
    });
    stream.on('error', (streamErr) => {
      response.end(streamErr);
    });

    return stream;
  });
};

module.exports.getParty = getParty;
module.exports.getVideo = getVideo;
