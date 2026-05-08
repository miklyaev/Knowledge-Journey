import React from 'react';
import SingleChoice from './SingleChoice';

interface PracticeBlockProps {
  question: string;
  options: string[];
  correctAnswer: number;
}

const PracticeBlock: React.FC<PracticeBlockProps> = (props) => {
  return <SingleChoice {...props} />;
};

export default PracticeBlock;
