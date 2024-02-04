import '../styles/Start.css'
import Albin from "../components/Albin.tsx";

const Start = ({onButtonClick}: {onButtonClick: () => void}) => {
  return (
      <div className={"start-container"}>
          <Albin/>
          <button onClick={onButtonClick}>Skål!</button>
      </div>
  );
}

export default Start;