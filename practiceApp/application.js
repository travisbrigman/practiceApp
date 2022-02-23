//# sourceURL=application.js

//
//  application.js
//  practiceApp
//
//  Created by Travis Brigman on 2/18/22.
//

/**
 * @description The onLaunch callback is invoked after the application JavaScript
 * has been parsed into a JavaScript context. The handler is passed an object
 * that contains options passed in for launch. These options are defined in the
 * swift or objective-c client code. Options can be used to communicate to
 * your JavaScript code that data and as well as state information, like if the
 * the app is being launched in the background.
 *
 * The location attribute is automatically added to the object and represents
 * the URL that was used to retrieve the application JavaScript.
 */

var baseURL;
var serverURL;
let moviesArray = [];
var selectedTrailerURL = "";
App.onLaunch = (options) => {
  baseURL = options.BASEURL;
  serverURL = "Server/stack.xml";
  const xmlLocation = options.BASEURL + serverURL;
  const jsonLocation =
    "https://itunes.apple.com/us/rss/topmovies/limit=100/json";
  var alert = createAlert("Hello World!", "Welcome to tvOS");
  navigationDocument.pushDocument(alert);

  getTemplate(xmlLocation, jsonLocation);
};

const getTemplate = (url, jsonURL) => {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      getJson(jsonURL, xhr.responseXML);
    }
  };
  xhr.open("GET", url, false);
  xhr.send();
};

const getJson = (url, template) => {
  var templateXHR = new XMLHttpRequest();
  templateXHR.responseType = "document";
  templateXHR.addEventListener(
    "load",
    () => {
      insertJson(templateXHR.responseText, template);
    },
    false
  );
  templateXHR.open("GET", url, true);
  templateXHR.send();
};

const insertJson = (information, template) => {
  // Parse the JSON information.
  var results = JSON.parse(information);
  moviesArray = results.feed.entry;
  //find a section element on the DOM
  let section = template.getElementsByTagName("section").item(0);

  // Create an empty data item for the section.
  section.dataItem = new DataItem();
  let newItems = results.feed.entry.map((result) => {
    let objectItem = new DataItem(result.category.attributes.term, result.id);
    objectItem.imageURL = result["im:image"][2].label.replace(
      "113x170",
      "600x600"
    );
    objectItem.title = result["im:name"].label;
    return objectItem;
  });
  section.dataItem.setPropertyPath("movies", newItems);

  template.addEventListener("play", playSelectedMovie);
  navigationDocument.pushDocument(template);
};

//this gets called from the stack.xml file
const getDocument = (extension, event) => {
  var templateXHR = new XMLHttpRequest();
  var url = baseURL + extension;
  var loadingScreen = loadingTemplate();

  templateXHR.responseType = "document";
  templateXHR.addEventListener(
    "load",
    () => {
      pushPage(templateXHR.responseXML, loadingScreen, event);
    },
    false
  );
  templateXHR.open("GET", url, true);
  templateXHR.send();
};

const fixXML = (str) => {
  return str.replace("&", "&amp;");
};

const pushPage = (page, loading, event) => {
  const movie = moviesArray.find(
    (movieObject) => movieObject["im:name"].label === event.target.textContent
  );
  const productTemp = page.getElementsByTagName("productTemplate").item(0);
  const detailItem = (productTemp.dataItem = new DataItem("detail", 113));
  detailItem.title = fixXML(movie["im:name"].label);
  detailItem.genre = fixXML(movie.category.attributes.term);
  detailItem.director = fixXML(movie["im:artist"].label);
  detailItem.releaseDate = fixXML(movie["im:releaseDate"].attributes.label);
  detailItem.price = fixXML(movie["im:price"].label);
  detailItem.summary = fixXML(movie.summary.label);
  detailItem.trailerURL = movie.link[1].attributes.href;
  detailItem.coverURL = fixXML(
    movie["im:image"][0].label.replace("39x60", "600x600")
  );
  detailItem.setPropertyPath("detail");

  selectedTrailerURL = movie.link[1].attributes.href;
  page.addEventListener("select", handleProductEvent);
  page.addEventListener("play", handleProductEvent);

  let section = page.getElementsByTagName("section").item(0);

  // Create an empty data item for the section.
  section.dataItem = new DataItem();
  let newItems = moviesArray.map((result) => {
    if (result["im:name"].label !== movie["im:name"].label) {
      let objectItem = new DataItem(result.category.attributes.term, result.id);
      objectItem.imageURL = result["im:image"][2].label.replace(
        "113x170",
        "600x600"
      );
      objectItem.title = result["im:name"].label;
      return objectItem;
    }
  });
  section.dataItem.setPropertyPath("movies", newItems);

  page.addEventListener("play", playSelectedMovie);
  navigationDocument.replaceDocument(page, loading);
};

const playSelectedMovie = (event) => {
  const selectedMovie = event.target;
  const movieName = selectedMovie.textContent;
  const selectedMovieObject = moviesArray.find((movie) => {
    return movie["im:name"].label === movieName;
  });

  console.log(selectedMovie, movieName, selectedMovieObject);
  const trailerURL = selectedMovieObject.link[1].attributes.href;
  playMovie(trailerURL);
};

const playMovie = (url) => {
  const mediaItem = new MediaItem("video", url);
  mediaItem.title = "Trailer";
  const playlist = new Playlist();
  playlist.push(mediaItem);
  const player = new Player();
  player.playlist = playlist;
  player.play();
};

handleProductEvent = (event) => {
  const target = event.target;
  console.log(target);
  if (target.tagName === "description") {
    const body = target.textContent;
    const alertDocument = createAlert("", body);
    navigationDocument.presentModal(alertDocument);
  } else if (target.tagName === "buttonLockup") {
    // const trailerURL = target.textContent;
    // const trailerURL = target.innerHTML;
    playMovie(selectedTrailerURL);
  } else {
    // const trailerURL = target.textContent;
    // playMovie(trailerURL);
  }
};

// Creates a loading template that displays a rotating circle while movie information is downloaded.
const loadingTemplate = () => {
  var template =
    "<document><loadingTemplate><activityIndicator><text>Loading</text></activityIndicator></loadingTemplate></document>";
  var templateParser = new DOMParser();
  var parsedTemplate = templateParser.parseFromString(
    template,
    "application/xml"
  );
  navigationDocument.pushDocument(parsedTemplate);
  return parsedTemplate;
};

/**
 * This convenience function returns an alert template, which can be used to present errors to the user.
 */
var createAlert = function (title, description) {
  var alertString = `<?xml version="1.0" encoding="UTF-8" ?>
        <document>
          <alertTemplate>
            <title>${title}</title>
            <description>${description}</description>
          </alertTemplate>
        </document>`;

  var parser = new DOMParser();

  var alertDoc = parser.parseFromString(alertString, "application/xml");

  return alertDoc;
};
