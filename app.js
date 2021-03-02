const express = require('express');
const mongoose = require('mongoose')
const ejsMate = require('ejs-mate');
const path = require('path');
const ModelTrafficInstance = require('./models/modelTraffic');
const ModelRoommate = require('./models/modelRoommate');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const session = require('express-session');
const catchAsync = require('./utils/catchAsync');
const uuid = require('uuid')


mongoose.connect('mongodb://localhost:27017/traffic_light', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Database Connected');
});

mongoose.set('useFindAndModify', false);

const app = express();

const sessionConfig = {
    secret: 'needtochange',
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true
    }
}
app.use(session(sessionConfig));
app.use(flash());


app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))
app.use(express.urlencoded({extended: true}));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))
console.log(path.join(__dirname, 'public'))


app.use((req, res, next) => {
    // res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error')
    next();
})

app.get('/', (req, res) => {
    console.log('home')
    res.render('home.ejs')
})

app.get('/new', catchAsync(async (req, res, next) => {
    console.log('new instance')
    const trafficInstance = new ModelTrafficInstance({'url': uuid.v4()});
    await trafficInstance.save();
    req.flash('success', 'Successfully made a new traffic light!');
    res.redirect(`/${trafficInstance.url}`)
}))


app.get('/:idInstance/', async (req, res) => {
    console.log('Instance Page')
    const trafficInstance = await ModelTrafficInstance.findOne({'url': req.params.idInstance}).populate('roommates')
    const instanceURL = trafficInstance.url;
    const listName = trafficInstance.roommates;
    const msgDisplay = ["Free, come on in!", "Can come in quietly.", "Busy, you shall not pass!"]
    res.render('trafficInstance.ejs', {listName, instanceURL, msgDisplay})
});

app.post('/:idInstance', async (req, res, next) => {
    const roommate = new ModelRoommate(req.body.roommate);
    await roommate.save();

    // add to traffic instance
    const trafficInstance = await ModelTrafficInstance.findOne({'url': req.params.idInstance})
    trafficInstance.roommates.push(roommate)
    await trafficInstance.save()

    res.redirect(`/${req.params.idInstance}`);
});


app.put('/:idInstance/:idRoommate/', catchAsync(async (req, res) => {
    const {idRoommate} = req.params;
    console.log(req.body['roommate'])
    if (req.body['roommate']['status'].match(/^[0-9]+$/) == null) {
        delete req.body['roommate']['status'];
    }

    req.body['roommate']['lastUpdate'] = Date.now()
    const roommate = await ModelRoommate.findByIdAndUpdate(idRoommate, {...req.body.roommate})
    res.redirect(`/${req.params.idInstance}`);
}))

app.delete('/:idInstance/:idRoommate', catchAsync(async (req, res) => {
    const {idRoommate} = req.params;
    await ModelRoommate.findByIdAndDelete(idRoommate);
    res.redirect(`/${req.params.idInstance}`);
}))


app.listen(3000, () => {
    console.log('Serving on port 3000')
})
