import {
  Container,
  Row,
} from "reactstrap";

const OtherInfos = () => {
  return (
    <Container className="mt-4" fluid>
      <Row>
        <div className="col">
          <h1>Outras informações</h1>
          Visite a <a href="https://github.com/nabormendonca/qlattes" target="_blank" rel="noreferrer">página do projeto</a> no GitHub para obter mais informações 
          sobre a <img src={require("../assets/img/qlattes-logo.png")} width="100" style={{marginLeft: '-2px', marginTop: '-10px'}} alt='logo'/>, incluindo instruções 
          de uso, detalhes sobre as fontes de dados utilizadas, política de privacidade, e melhorias sendo consideradas para versões futuras.
        </div>
      </Row>
    </Container>
  );
}

export default OtherInfos;
