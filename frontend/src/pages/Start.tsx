import {Link} from "react-router-dom";
import '../styles/Start.css'
import Albin from "../components/Albin.tsx";

const Start = () => {
  return (
      <div className={"start-container"}>
          <Albin/>
          <Link to="/songs">
              <button>Skål!</button>
          </Link>
      </div>
  );
}

export default Start;