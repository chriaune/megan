export default function TravelHotel() {
  return (
    <div className="page">
      <h2>Travel & Hotel</h2>

      <div className="card">
        <h3>Hotel</h3>

        <p>
          Ann Arbor Marriott Ypsilanti at Eagle Crest
          <br />
          1275 S Huron St
          <br />
          Ypsilanti, MI 48197
        </p>

        <button
          onClick={() =>
            window.open(
              "https://maps.google.com/?q=Ann+Arbor+Marriott+Ypsilanti+at+Eagle+Crest",
              "_blank"
            )
          }
        >
          Open in Maps
        </button>
      </div>

      <div className="card">
        <h3>Phone</h3>

        <p>+1 734-487-2000</p>

        <button
          onClick={() =>
            (window.location.href = "tel:+17344872000")
          }
        >
          Call Hotel
        </button>
      </div>

      <div className="card">
        <h3>Parking</h3>
        <p>Parking available on site.</p>
      </div>

      <div className="card">
        <h3>Airport</h3>
        <p>Detroit Metropolitan Wayne County Airport (DTW)</p>
      </div>
    </div>
  );
}