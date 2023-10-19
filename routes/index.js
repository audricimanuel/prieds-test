var express = require('express');
var router = express.Router();
const stock_read_log = require('../models/stock_read_log');
const FileSystem = require("fs");

router.use('/export-data', async (req, res) => {
  const list = await stock_read_log.aggregate([
    {
      $match: {}
    }
  ]).exec();

  FileSystem.writeFile('./stock_read_log.json', JSON.stringify(list), (error) => {
      if (error) throw error;
  });

  console.log('stock_read_log.json exported!');
  res.json({statusCode: 1, message: 'stock_read_log.json exported!'})
});

router.use('/import-data', async (req, res) => {
  const list = await stock_read_log.aggregate([
    {
      $match: {}
    }
  ]).exec();

  FileSystem.readFile('./stock_read_log.json', async (error, data) => {
      if (error) throw error;

      const list = JSON.parse(data);

      const deletedAll = await stock_read_log.deleteMany({});

      const insertedAll = await stock_read_log.insertMany(list);

      console.log('stock_read_log.json imported!');
  res.json({statusCode: 1, message: 'stock_read_log.json imported!'})
  });


})

router.use('/edit-repacking-data', async (req, res) => {

  const reqBody = req.body;
  const bodyPayload = reqBody.payload;

  // updating rejected payload
  const rejectListPayload = reqBody.reject_qr_list?.map(async (code) => {
    const codePayload = code.payload;

    // updating the status and status_qc (reject) from current data
    await stock_read_log.updateOne(
      {payload: codePayload},
      {
        $set: {
          status: 0,
          status_qc: 1,
        }
      }
    );

    //removing from the parent data
    await stock_read_log.updateOne(
      {payload: bodyPayload},
      {
        $pull: {
          qr_list: {
            payload: codePayload
          }
        }
      }
    );

    // updating the qty based on length of qr_list
    const updatedData = await stock_read_log.findOne({payload: bodyPayload});
    await stock_read_log.updateOne({payload: bodyPayload}, {$set: {qty: updatedData.qr_list.length}});

    return codePayload;
  });

  await Promise.all(rejectListPayload);

  const newListPayload = reqBody.new_qr_list?.map(async (code) => {
    const codePayload = code.payload;
    const currentData = await stock_read_log.findOne({payload: codePayload});
    const currentParent = await stock_read_log.findOne({'qr_list.payload': codePayload});

    // updating parent data of current payload
    await stock_read_log.updateOne(
      {'qr_list.payload': {$in: [codePayload]}},
      {
        $pull: {
          qr_list: {
            payload: codePayload
          }
        }
      }
    );

    // updating the qty based on length of qr_list
    const updatedCurrentPayload = await stock_read_log.findOne({payload: currentParent.payload});
    await stock_read_log.updateOne({payload: currentParent.payload}, {$set: {qty: updatedCurrentPayload.qr_list.length}});

    // updating parent target data
    await stock_read_log.updateOne(
      {payload: bodyPayload},
      {
        $push: {
          qr_list: currentData
        }
      }
    );

    // updating the qty based on length of qr_list
    const updatedTarget = await stock_read_log.findOne({payload: bodyPayload});
    await stock_read_log.updateOne({payload: bodyPayload}, {$set: {qty: updatedTarget.qr_list.length}});

    return codePayload;
  });

  await Promise.all(newListPayload);

  res.json({message: 'success'});

})

router.use('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
