/*global chrome*/
import {
  Container,
  Row,
  Form,
  FormGroup,
  InputGroupAddon,
  InputGroupText,
  Input,
  InputGroup,
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from "reactstrap";
import GroupItem from "components/GroupItem";
import { useState, useMemo, useEffect } from "react";

import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

import {
  addNewGroup,
  getGroups
} from "../utils";

const GroupList = ({
  authors,
  groups,
  updateGroups,
  authorsNameLink,
  allQualisScores
}) => {
  const [modal, setModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAuthors, setNewGroupAuthors] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  const [localGroups, setLocalGroups] = useState({});
  const [localAuthors, setLocalAuthors] = useState({});

  // Atualiza localGroups quando groups muda
  useEffect(() => {
    if (groups && Object.keys(groups).length > 0) {
      setLocalGroups(groups);
    }
  }, [groups]);

  // Atualiza localAuthors quando authors muda
  useEffect(() => {
    if (authors && Object.keys(authors).length > 0) {
      setLocalAuthors(authors);
    }
  }, [authors]);

  const authorOptions = useMemo(() => {
    if (!localAuthors || Object.keys(localAuthors).length === 0) return [];
    return Object.entries(localAuthors).map(([link, info]) => ({
      link,
      name: info.name,
    }));
  }, [localAuthors]);

  const toggle = () => setModal(!modal);

  const handleNewButton = async () => {
    let groupsData = await chrome.storage.local.get('groupData')
    const grupos = groupsData['groupData'];
    const nomesGrupos = Object.values(grupos).map(grupo => grupo.name);

    const nomeJaExiste = nomesGrupos.some(
      nome => nome.toLowerCase() === newGroupName.toLowerCase()
    );

    if (nomeJaExiste) {
      alert("Já existe um grupo com esse nome!");
      return;
    }

    await addNewGroup(newGroupName, newGroupAuthors);
    toggle();
    setNewGroupAuthors([]);
    setNewGroupName("");
    updateGroups();
  };

  const handleCancelButton = () => {
    setNewGroupAuthors([]);
    setNewGroupName("");
    toggle();
  }

  const searchGroupOrAuthor = (event, value) => {
    setSelectedOption(value);
  }

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
                onChange={searchGroupOrAuthor}
                options={authorsNameLink.concat(Object.values(localGroups))}
                getOptionLabel={(option) => option.name}
                filterSelectedOptions
                noOptionsText="Não há CVs ou grupos disponíveis"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Pesquise por um CV ou grupo"
                  />
                )}
                sx={{
                  width: '80%',
                  '& .MuiButtonBase-root': {
                      display: 'none',
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
            <Button
              color="white"
              onClick={toggle}
              size="sm"
              style={{
                width: '160px',
                alignSelf: 'flex-start',
                color: '#415e98'
              }}
            >
              Criar novo grupo
            </Button>
          </FormGroup>
        </Form>
      </Container>
      {/* Page content */}
      <Container className="mb-5" fluid>
        <Row>
          <div className="col">
            {Object.entries(localGroups).map(group => {
              if (selectedOption?.authors && group[1].name !== selectedOption.name) return null;

              let groupAuthors = group[1].authors
                .filter(link => localAuthors[link])
                .map(link => ({ link, name: localAuthors[link].name }));

              if (selectedOption?.link) {
                groupAuthors = groupAuthors.filter(item => item.link === selectedOption.link);
                if(groupAuthors.length === 0) return null;
              }

              return <GroupItem
                key={group[0]}
                groupId={group[0]}
                groupName={group[1].name}
                allAuthors={Object.entries(localAuthors)
                  .filter(author => !group[1].authors.includes(author[0]))
                  .map(([link, author]) => ({link, name: author.name}))}
                authors={groupAuthors}
                updateGroups={updateGroups}
                allQualisScores={allQualisScores}
              />
            })}
          </div>
        </Row>
      </Container>

      {/* New group Modal */}
      <Modal isOpen={modal} toggle={toggle}>
        <ModalHeader toggle={toggle}>Adicionar um novo Grupo</ModalHeader>
        <ModalBody>
          <Input
            placeholder="Nome do grupo"
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />

          <Autocomplete
            multiple
            options={authorOptions}
            value={authorOptions.filter(option => newGroupAuthors.includes(option.link))}
            onChange={(event, newValue) => setNewGroupAuthors(newValue.map(v => v.link))}
            getOptionLabel={(option) => option.name}
            filterSelectedOptions
            noOptionsText="Não há CVs disponíveis"
            renderInput={(params) => (
              <TextField {...params} placeholder="Selecione um CV" />
            )}
            sx={{
              width: "90%",
              "& .MuiButtonBase-root": { color: "#415e98" },
              "& .MuiInputBase-input": { color: "#415e98" },
              "fieldset": { border: "none" },
              "& .MuiInputBase-root > .MuiButtonBase-root": {
                border: "1px #415e98 solid",
                backgroundColor: "transparent",
                "& .MuiSvgIcon-root": { color: "#415e98" }
              }
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={handleNewButton}>
            Salvar
          </Button>{' '}
          <Button color="secondary" onClick={handleCancelButton}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default GroupList;