import React from 'react';
import styled from 'styled-components';

const data = [
  {
    titleFront: "AUTOMATED",
    descFront: "Zero Manual Entry",
    titleBack: "Smart Extraction",
    descBack: "AI reads survey emails, extracts content and attachments, then generates structured reports — no human effort needed."
  },
  {
    titleFront: "TRANSPARENT",
    descFront: "Full Visibility",
    titleBack: "End-to-End Tracking",
    descBack: "Track every survey from the moment it lands in your inbox to the final structured report — complete audit trail."
  },
  {
    titleFront: "INCLUSIVE",
    descFront: "Every Voice Matters",
    titleBack: "Community First",
    descBack: "Citizens report issues, Volunteers act on the ground, Supervisors oversee it all — seamless collaboration."
  }
];

const WhyChooseUs = () => {
  return (
    <Container>
      <SectionTitle>Why <span>Choose Us</span></SectionTitle>
      <CardsWrapper>
        {data.map((item, index) => (
          <StyledWrapper key={index}>
            <div className="flip-card">
              <div className="flip-card-inner">
                <div className="flip-card-front">
                  <p className="title">{item.titleFront}</p>
                  <p>{item.descFront}</p>
                </div>
                <div className="flip-card-back">
                  <p className="title">{item.titleBack}</p>
                  <p>{item.descBack}</p>
                </div>
              </div>
            </div>
          </StyledWrapper>
        ))}
      </CardsWrapper>
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  padding: 20px 0 120px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 5;
`;

const SectionTitle = styled.h2`
  font-size: clamp(2.5rem, 4vw, 4rem);
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 60px;
  text-align: center;
  letter-spacing: -1px;
  font-family: 'Outfit', sans-serif;
  
  span {
    color: coral;
  }
`;

const CardsWrapper = styled.div`
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 1200px;
  width: 100%;
  padding: 0 20px;
`;

const StyledWrapper = styled.div`
  .flip-card {
    background-color: transparent;
    width: 280px;
    height: 380px;
    perspective: 1000px;
    font-family: 'Inter', sans-serif;
  }

  .title {
    font-size: 2em;
    font-weight: 900;
    text-align: center;
    margin: 0 0 10px 0;
    font-family: 'Outfit', sans-serif;
  }

  .flip-card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    text-align: center;
    transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    transform-style: preserve-3d;
  }

  .flip-card:hover .flip-card-inner {
    transform: rotateY(180deg);
  }

  .flip-card-front, .flip-card-back {
    box-shadow: 0 15px 30px 0 rgba(255, 127, 80, 0.2);
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 30px;
    width: 100%;
    height: 100%;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    border: 1px solid coral;
    border-radius: 1.5rem;
  }

  .flip-card-front {
    background: linear-gradient(120deg, bisque 60%, rgb(255, 231, 222) 88%,
       rgb(255, 211, 195) 40%, rgba(255, 127, 80, 0.603) 48%);
    color: coral;
  }

  .flip-card-back {
    background: linear-gradient(120deg, rgb(255, 174, 145) 30%, coral 88%,
       bisque 40%, rgb(255, 185, 160) 78%);
    color: white;
    transform: rotateY(180deg);
  }

  .flip-card-front p:not(.title) {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0;
  }

  .flip-card-back p:not(.title) {
    font-size: 1.1rem;
    line-height: 1.5;
    margin: 0;
  }
`;

export default WhyChooseUs;
