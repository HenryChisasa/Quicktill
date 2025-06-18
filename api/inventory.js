const app = require("express")();
const server = require("http").Server(app);
const bodyParser = require("body-parser");
const Datastore = require("nedb");
const async = require("async");
const fileUpload = require("express-fileupload");
const multer = require("multer");
const fs = require("fs");
const csv = require('csv-parser');
const unzipper = require('unzipper');

const storage = multer.diskStorage({
  destination: process.env.APPDATA + "/POS/uploads",
  filename: function (req, file, callback) {
    callback(null, Date.now() + ".jpg"); //
  },
});

let upload = multer({ storage: storage });

app.use(bodyParser.json());

module.exports = app;

let inventoryDB = new Datastore({
  filename: process.env.APPDATA + "/POS/server/databases/inventory.db",
  autoload: true,
});

inventoryDB.ensureIndex({ fieldName: "_id", unique: true });

app.get("/", function (req, res) {
  res.send("Inventory API");
});

app.get("/product/:productId", function (req, res) {
  if (!req.params.productId) {
    res.status(500).send("ID field is required.");
  } else {
    inventoryDB.findOne(
      {
        _id: parseInt(req.params.productId),
      },
      function (err, product) {
        res.send(product);
      }
    );
  }
});

app.get("/products", function (req, res) {
  inventoryDB.find({}, function (err, docs) {
    res.send(docs);
  });
});

app.post("/product", upload.single("imagename"), function (req, res) {
  let image = "";

  if (req.body.img != "") {
    image = req.body.img;
  }

  if (req.file) {
    image = req.file.filename;
  }

  if (req.body.remove == 1) {
    const path = "./resources/app/public/uploads/product_image/" + req.body.img;
    try {
      fs.unlinkSync(path);
    } catch (err) {
      console.error(err);
    }

    if (!req.file) {
      image = "";
    }
  }

  let Product = {
    _id: parseInt(req.body.id),
    price: req.body.price,
    category: req.body.category,
    quantity: req.body.quantity == "" ? 0 : req.body.quantity,
    name: req.body.name,
    stock: req.body.stock == "on" ? 0 : 1,
    barcode: req.body.barcode ? req.body.barcode : parseInt(req.body.id),
    img: image,
  };

  if (req.body.id == "") {
    Product._id = Math.floor(Date.now() / 1000);
    inventoryDB.insert(Product, function (err, product) {
      if (err) res.status(500).send(err);
      else res.send(product);
    });
  } else {
    inventoryDB.update(
      {
        _id: parseInt(req.body.id),
      },
      Product,
      {},
      function (err, numReplaced, product) {
        if (err) res.status(500).send(err);
        else res.sendStatus(200);
      }
    );
  }
});

app.delete("/product/:productId", function (req, res) {
  const img_path = process.env.APPDATA + "/POS/uploads/" + req.query.image_path;
  inventoryDB.remove(
    {
      _id: parseInt(req.params.productId),
    },
    function (err, numRemoved) {
      if (err) res.status(500).send(err);
      fs.unlink(img_path, function (err) {
        if (err) {
          console.error(`Failed to delete image: ${img_path}`, err);
        }
        res.sendStatus(200);
      });
    }
  );
});

app.post("/product/sku", function (req, res) {
  var request = req.body;
  inventoryDB.findOne(
    {
      barcode: request.skuCode,
    },
    function (err, product) {
      res.send(product);
    }
  );
});

app.decrementInventory = function (products, callback) {
  async.eachSeries(
    products,
    function (transactionProduct, callback) {
      inventoryDB.findOne(
        {
          _id: parseInt(transactionProduct.id),
        },
        function (err, product) {
          if (!product || !product.quantity) {
            callback();
          } else {
            let updatedQuantity =
              parseInt(product.quantity) -
              parseInt(transactionProduct.quantity);

            inventoryDB.update(
              {
                _id: parseInt(product._id),
              },
              {
                $set: {
                  quantity: updatedQuantity,
                },
              },
              {},
              callback
            );
          }
        }
      );
    },
    function (err) {
      if (err) callback(err);
      else callback(null, "Inventory updated successfully.");
    }
  );
};

// Bulk upload endpoint
const multerBulk = multer({ dest: process.env.APPDATA + '/POS/uploads' });
app.post('/bulk-upload', multerBulk.fields([
  { name: 'csvFile', maxCount: 1 },
  { name: 'imagesZip', maxCount: 1 }
]), async function(req, res) {
  if (!req.files || !req.files['csvFile']) {
    return res.status(400).json({ message: 'No CSV file uploaded.' });
  }
  const csvFilePath = req.files['csvFile'][0].path;
  let imagesMap = {};
  const uploadDir = process.env.APPDATA + '/POS/uploads/';
  // If imagesZip is provided, extract it and build a map of filenames
  if (req.files['imagesZip']) {
    const zipPath = req.files['imagesZip'][0].path;
    await new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
          const fileName = entry.path;
          if (fileName.match(/\.(jpg|jpeg|png|gif)$/i)) {
            const destPath = uploadDir + fileName;
            entry.pipe(fs.createWriteStream(destPath));
            imagesMap[fileName] = fileName;
          } else {
            entry.autodrain();
          }
        })
        .on('close', resolve)
        .on('error', reject);
    });
  }
  const results = [];
  const errors = [];
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      if (!row.name || !row.category || !row.price || !row.quantity) {
        errors.push({ row, error: 'Missing required fields' });
        return;
      }
      let imgFile = row.img || '';
      if (imgFile && imagesMap[imgFile]) {
        imgFile = imagesMap[imgFile];
      }
      let Product = {
        _id: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000),
        name: row.name,
        category: row.category,
        price: row.price,
        quantity: row.quantity,
        barcode: row.barcode || '',
        stock: row.stock === '0' ? 0 : 1,
        img: imgFile,
      };
      results.push(Product);
    })
    .on('end', () => {
      if (results.length === 0) {
        return res.status(400).json({ message: 'No valid products found in file.' });
      }
      inventoryDB.insert(results, function(err, newDocs) {
        if (err) {
          return res.status(500).json({ message: 'Database error.', error: err });
        }
        let msg = `${newDocs.length} products uploaded successfully.`;
        if (errors.length > 0) msg += ` ${errors.length} rows skipped due to errors.`;
        return res.json({ message: msg, errors });
      });
    })
    .on('error', (err) => {
      return res.status(500).json({ message: 'Failed to parse CSV.', error: err });
    });
});
