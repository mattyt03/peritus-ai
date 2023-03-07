import Card from '../components/Card';
import { Checkmark } from 'react-checkmark';

const Success = () => {
    return (
        <Card>
            <div className='success'>
                <Checkmark size='xLarge' color='#6772e5'/>
                <h1 className='success__h1'>Success!</h1>
                <p className='success-message'>Your account has been successfully linked this application.</p>
            </div>
        </Card>
     );
}
 
export default Success;