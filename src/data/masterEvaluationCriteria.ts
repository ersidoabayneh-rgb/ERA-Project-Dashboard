import { ConsultantEvaluationCriterion } from '../types';
import { CRITERIA_DIMENSION_A } from './masterCriteriaA';
import { CRITERIA_DIMENSION_B } from './masterCriteriaB';
import { CRITERIA_DIMENSION_C } from './masterCriteriaC';
import { CRITERIA_DIMENSION_D } from './masterCriteriaD';
import { CRITERIA_DIMENSION_E } from './masterCriteriaE';

export const CONSULTANT_EVALUATION_CRITERIA: ConsultantEvaluationCriterion[] = [
  ...CRITERIA_DIMENSION_A,
  ...CRITERIA_DIMENSION_B,
  ...CRITERIA_DIMENSION_C,
  ...CRITERIA_DIMENSION_D,
  ...CRITERIA_DIMENSION_E
];
