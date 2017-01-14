
import {developmentConfig, productionConfig} from '../config';
import {DEV_ENV} from './constants';


const isDevelopmentMode = process.env.NODE_ENV === DEV_ENV;

export default isDevelopmentMode ? developmentConfig : productionConfig;
