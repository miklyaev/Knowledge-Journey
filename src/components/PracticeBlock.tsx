import React from 'react';
import SingleChoice from './TimerSingleChoice';

interface PracticeBlockProps {
  question: string;
  options: string[];
  correctAnswer: number;
  onComplete?: (isCorrect: boolean, points?: number) => void;
}

const PracticeBlock: React.FC<PracticeBlockProps> = (props) => {
  return <SingleChoice {...props} timerSeconds={60} onComplete={props.onComplete} />;
};

export default PracticeBlock;
