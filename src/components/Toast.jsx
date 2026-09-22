import { useData } from '../context/DataContext';

export default function Toast() {
  const { toastMsg, toastVisible } = useData();
  return (
    <div id="toast" className={toastVisible ? 'show' : ''}>
      {toastMsg}
    </div>
  );
}
