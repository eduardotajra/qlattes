import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { importCVFromCsv, getLattesData } from '../utils';
import {
  Container,
  Row,
  Card,
  CardHeader,
  CardBody,
  Form,
  FormGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroup,
  Button,
} from "reactstrap";
import CVItem from "components/CVItem";

import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
const CVList = ({
  authorsNameLink,
  allQualisScores,
  updateAuthors
}) => {
  const fileInputRef = useRef(null);
  const [filteredAuthors, setFilteredAuthors] = useState([]);

  React.useEffect(() => {
    if (authorsNameLink && authorsNameLink.length > 0) {
      setFilteredAuthors(authorsNameLink);
    }
  }, [authorsNameLink]);
  
  const searchAuthor = (event, values) => {
    if (!values)
      setFilteredAuthors(authorsNameLink);
    else
      setFilteredAuthors([values]);
  }

  const updateCurrAuthors = (authorLink) => {
    setFilteredAuthors(filteredAuthors.filter(author => author.link !== authorLink));
    updateAuthors();
  }

  const handleImportFile = (event) => {
    const file = event.target.files[0];
    if (!file) {
      fileInputRef.current.value = "";
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data, errors }) => {
        if (errors.length) {
          alert('Erro ao ler CSV: verifique o formato.');
          return;
        }
        const required = ['nome','link','ano','titulo','periodico','issn','qualis','jcr','baseYear'];
        const missing = required.filter(h => !Object.keys(data[0]).includes(h));
        if (missing.length) {
          alert(`CSV inválido. Faltando: ${missing.join(', ')}`);
          return;
        }

        const allData = await getLattesData();
        if (allData[data[0].link]) {
          const overwrite = window.confirm(
            `Já existe um currículo salvo para "${data[0].nome}".\n` +
            `Deseja sobrescrever os dados existentes?`
          );
          if (!overwrite) {
            alert('Importação cancelada.');
            fileInputRef.current.value = "";
            return;
          }
        }

        const pubInfo = {};
        data.forEach(row => {
          const y = row.ano;
          if (!pubInfo[y]) pubInfo[y] = [];
          pubInfo[y].push({
            issn: row.issn,
            title: row.titulo,
            pubName: row.periodico,
            qualis: row.qualis,
            jcr: row.jcr,
            baseYear: row.baseYear
          });
        });
        await importCVFromCsv(data[0].link, data[0].nome, pubInfo);
        updateAuthors();
        alert('Currículo importado com sucesso!');
        fileInputRef.current.value = '';
      }
    });
  };

  return (
    <>
      <Container fluid className="mt-3 mb-3" expand="md">
        <Form className="navbar-search navbar-search-dark form-inline mr-3 d-md-flex">
          <FormGroup className="w-100" style={{ justifyContent: 'space-between' }}>
            <InputGroup className="input-group-alternative" style={{ width:"400px", border: 'none', backgroundColor: 'white' }}>
              <InputGroupAddon addonType="prepend">
                <InputGroupText>
                  <i className="fas fa-search" style={{ color: '#415e98' }}/>
                </InputGroupText>
              </InputGroupAddon>
              <Autocomplete
                onChange={searchAuthor}
                options={authorsNameLink}
                getOptionLabel={(option) => option.name}
                filterSelectedOptions
                noOptionsText="Não há CVs disponíveis"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Pesquise por um CV"
                  />
                )}
                sx={{
                  width: '80%',
                  '& .MuiButtonBase-root': {
                      color: '#415e98',
                  },
                  '& .MuiInputBase-input': {
                      color: '#415e98',
                  },
                  '& fieldset': {
                    border: "none",
                  }
                }}
              />
            </InputGroup>
            <div style={{ display: 'flex', alignSelf:'flex-start'}}>
              <Button
                color="white"
                size="sm"
                onClick={() =>{ 
                  fileInputRef.current.value = "";
                  fileInputRef.current.click();}}
                style={{
                  width: '160px',
                  alignSelf: 'flex-start',
                  color: '#415e98'
                }}
              >
                {/* <i className="fas fa-file-csv mr-1" />  */}
                Importar Currículo
              </Button>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
            </div>
          </FormGroup>
        </Form>
      </Container>
      {/* Page content */}
      <Container className="mb-5" fluid>
        <Row>
          <div className="col">
            <Card className="shadow mt-3">
              <CardHeader className="bg-transparent" style={{ flexDirection: 'row', display: 'flex', justifyContent: "space-between", alignItems: 'center'}}>
                <h3 className="mb-0">Currículos Carregados</h3>
              </CardHeader>
              <CardBody>
                <Row className="icon-examples">
                  {filteredAuthors.map(author => <CVItem authorName={author.name} CVLink={author.link} key={author.link} allQualisScores={allQualisScores} updateAuthors={updateCurrAuthors}/>)}
                </Row>
              </CardBody>
            </Card>
          </div>
        </Row>
      </Container>
    </>
  );
};

export default CVList;
