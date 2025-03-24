/*global chrome*/
import React, { useState } from 'react';

import {
  Form,
  FormGroup,
  InputGroupAddon,
  InputGroupText,
  Input,
  InputGroup,
  Label,
  Container,
} from 'reactstrap';
import Autocomplete from '@mui/material/Autocomplete';
import ListSubheader from '@mui/material/ListSubheader';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

import DataTable from 'components/Data/DataTable';
import DataGraph from 'components/Data/DataGraph';
import TopTable from 'components/Data/TopTable';
import {
  addMissingYearsToPubInfo,
  getQualisStats,
  addMissingYearsToAuthorStats,
} from '../utils';

const Index = ({
  authors,
  groups,
  authorsNameLink,
  allQualisScores,
  previousArea,
  updateArea,
}) => {
  const [area, setArea] = useState(previousArea?.area);
  const [areaData, setAreaData] = useState(previousArea);
  const [viewType, setViewType] = useState('');
  const [showStatistics, setShowStatistics] = useState(false);

  const [initYear, setInitYear] = useState(0);
  const [endYear, setEndYear] = useState(0);
  const [initYearInput, setInitYearInput] = useState(0);
  const [endYearInput, setEndYearInput] = useState(0);

  const [qualisFilter, setQualisFilter] = useState(['A', 'B']);
  const [isUnifiedChart, setIsUnifiedChart] = useState(false);
  const [stats, setStats] = useState([]);
  const [individualStats, setIndividualStats] = useState([]);
  const [groupStats, setGroupStats] = useState([]);
  const [pubInfo, setPubInfo] = useState([]);
  const [individualPubInfo, setIndividualPubInfo] = useState([]);
  const [groupPubInfo, setGroupPubInfo] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const [cvOptions, setCvOptions] = useState([]);

  React.useEffect(() => {
    // Na montagem, construa a lista inicial
    const authorsNameLinkWithGroup = authorsNameLink.map((author) => ({
      ...author,
      groupType: 'Autores',
    }));
    const groupsWithGroup = Object.values(groups).map((grp) => ({
      ...grp,
      groupType: 'Grupos',
    }));
    setCvOptions([...authorsNameLinkWithGroup, ...groupsWithGroup]);
  }, [authorsNameLink, groups]);

  // Junta tudo em um só array
  // const cvOptions = [...authorsNameLinkWithGroup, ...groupsWithGroup];


  function handleViewTypeChange(value) {
    if (
      (value === 'scoreTableView' || value === 'scoreGraphicView') &&
      Object.keys(areaData).length === 0
    ) {
      alert(
        `Para visualizar a pontuação Qualis, é necessário selecionar uma Área do Conhecimento.`
      );
      return;
    }
    setViewType(value);
  }

  const handleAreaChange = async (event) => {
    // get previous area (if any)
    const prevArea = area;

    // get selected area
    const newArea = event.target.value;

    if (newArea === 'undefined') {
      // save area data to local store
      await chrome.storage.local.set({
        area_data: {
          area: newArea,
          scores: {},
          label: 'Sem Área do Conhecimento',
          source: {},
          base_year: '',
        },
      });
      updateArea();

      if (viewType === 'scoreTableView' || viewType === 'scoreGraphicView') {
        alert(
          `Para visualizar a pontuação Qualis, é necessário selecionar uma Área do Conhecimento.`
        );
        setViewType('');
      }
    } else {
      // find selected area data in Qualis score data
      var match = allQualisScores.find((elem) =>
        Object.keys(elem.areas).includes(newArea)
      );

      if (match) {
        if (Object.keys(match.areas[newArea].scores).length > 0) {
          const currAreaData = {
            area: newArea,
            ...match.areas[newArea],
          };
          setAreaData(currAreaData);
          setArea(newArea);

          // save area data to local store
          await chrome.storage.local.set({ area_data: currAreaData });
          updateArea();
        } else {
          // show no scores alert and reset area select to previous area (if any)
          alert(
            'Esta Área do Conhecimento não definiu pontuação específica para os estratos do Qualis.'
          );
          if (prevArea !== '') {
            // reset area select to previously selected option
            event.target.value = prevArea;
          } else {
            // reset area select to placeholder option
            event.target.selectedIndex = 0;
          }
        }
      }
    }
  };

  function handleSelectedPeriod(value) {
    setEndYearInput(endYear);
    switch (value) {
      case 'last5':
        setInitYearInput(endYear - 4);
        break;
      case 'last10':
        setInitYearInput(endYear - 9);
        break;
      default:
        setInitYearInput(initYear);
        break;
    }
  }

  function handleCVsSelect(event, values) {
    console.log('Dados dos autores:', authors);
    console.log('Itens selecionados:', values);

    // Mapeia os valores para links ou autores
    const selectedLinks = values
      .map((value) => (value.link ? value.link : value.authors))
      .flat()
      .filter((value, index, self) => self.indexOf(value) === index);

    if (selectedLinks.length === 0) {
      setShowAll(false);
      return;
    }

    console.log('Selected links:', selectedLinks);

    // Agora, use o array `selectedLinks` para encontrar os CVs correspondentes
    const allCvs = selectedLinks.map((link) => authors[link]);

    console.log('Dados de todos os CVs selecionados:', allCvs);

    const groupedCvs = {};
    values.forEach((value) => {
      if (value.link) {
        groupedCvs[value.name] = [authors[value.link]];
      } else {
        groupedCvs[value.name] = value.authors.map((author) => authors[author]);
      }
    });

    // Verificação de segurança para garantir que `authors[link]` existe
    allCvs.forEach((cv, index) => {
      if (!cv) {
        console.error(
          `Autor não encontrado para o link: ${selectedLinks[index]}`
        );
        return;
      }

      // Certifique-se de que o cv.pubInfo existe
      if (!cv.pubInfo) {
        console.error(
          `Publicações não encontradas para o CV: ${selectedLinks[index]}`
        );
        return;
      }
    });

    console.log('Dados dos CVs e grupos selecionados:', groupedCvs);

    // Obtém todas as publicações dos CVs
    const allPubInfos = allCvs.map((cv) => cv.pubInfo).flat();
    console.log('Dados de publicação de todos os CVs integrados:', allPubInfos);

    const individualPubInfos = {};
    allCvs.forEach((cv) => {
      individualPubInfos[cv.name] = cv.pubInfo;
    });
    console.log(
      'Dados de publicação de todos os CVs individuais:',
      individualPubInfos
    );

    const groupedPubInfos = {};
    Object.keys(groupedCvs).forEach((group) => {
      groupedPubInfos[group] = groupedCvs[group].map((cv) => cv.pubInfo).flat();
    });
    console.log('Dados de publicação dos CVs e grupos:', groupedPubInfos);

    // Merge pubInfos (mesclar todas as publicações por ano)
    const mergedAllPubInfos = {};
    for (const pubInfo of allPubInfos) {
      for (const year in pubInfo) {
        // console.log(`Ano ${year}:`, pubInfo[year]);
        if (!Array.isArray(mergedAllPubInfos[year])) {
          mergedAllPubInfos[year] = [];
        }
        mergedAllPubInfos[year] = mergedAllPubInfos[year].concat(pubInfo[year]);
      }
    }
    // console.log('mergedPubInfos:', JSON.stringify(mergedPubInfos, null, 2));
    console.log(
      'Dados de publicação de todos os CVs integrados (combinados por ano):',
      mergedAllPubInfos
    );

    const mergedIndividualPubInfos = {};
    for (const name in individualPubInfos) {
      mergedIndividualPubInfos[name] = {};
      for (const year in individualPubInfos[name]) {
        if (!Array.isArray(mergedIndividualPubInfos[name][year])) {
          mergedIndividualPubInfos[name][year] = [];
        }
        mergedIndividualPubInfos[name][year] = mergedIndividualPubInfos[name][
          year
        ].concat(individualPubInfos[name][year]);
      }
    }
    console.log(
      'Dados de publicação de todos os CVs individuais (combinados por ano):',
      mergedIndividualPubInfos
    );

    const mergedGroupedPubInfos = {};
    for (const group in groupedPubInfos) {
      mergedGroupedPubInfos[group] = {};
      for (const pubInfo of groupedPubInfos[group]) {
        for (const year in pubInfo) {
          if (!Array.isArray(mergedGroupedPubInfos[group][year])) {
            mergedGroupedPubInfos[group][year] = [];
          }
          mergedGroupedPubInfos[group][year] = mergedGroupedPubInfos[group][
            year
          ].concat(pubInfo[year]);
        }
      }
    }
    console.log(
      'Dados de publicação dos CVs e grupos (combinados por ano):',
      mergedGroupedPubInfos
    );

    // Defina os anos iniciais e finais
    const years = Object.keys(mergedAllPubInfos);
    const scores = areaData ? areaData.scores : {};

    // Inicializar estatísticas dos autores
    let allAuthorStats = {
      stats: [],
      minYear: years[0],
      maxYear: years[years.length - 1],
      totalPubs: NaN,
      pubInfo: [],
    };

    let individualAuthorStats = {};
    for (const name in individualPubInfos) {
      individualAuthorStats[name] = {
        stats: [],
        minYear: years[0],
        maxYear: years[years.length - 1],
        totalPubs: NaN,
        pubInfo: [],
      };
    }

    let groupedAuthorStats = {};
    for (const group in groupedPubInfos) {
      groupedAuthorStats[group] = {
        stats: [],
        minYear: years[0],
        maxYear: years[years.length - 1],
        totalPubs: NaN,
        pubInfo: [],
      };
    }

    // Adiciona anos ausentes (se houver) às estatísticas do autor
    const allPubInfoComplete = addMissingYearsToPubInfo(mergedAllPubInfos);
    allAuthorStats = addMissingYearsToAuthorStats(
      getQualisStats(allPubInfoComplete, 'qualis', scores),
      allPubInfoComplete
    );
    console.log(
      'Dados de publicação de todos os autores integrados (completos)',
      allPubInfoComplete
    );

    const individualPubInfoComplete = {};
    for (const name in mergedIndividualPubInfos) {
      individualPubInfoComplete[name] = addMissingYearsToPubInfo(
        mergedIndividualPubInfos[name],
        years[0]
      );
      individualAuthorStats[name] = addMissingYearsToAuthorStats(
        getQualisStats(individualPubInfoComplete[name], 'qualis', scores),
        individualPubInfoComplete[name],
        years[0]
      );
    }
    console.log(
      'Dados de publicação de todos os autores individuais (completos)',
      individualPubInfoComplete
    );

    const groupedPubInfoComplete = {};
    for (const group in mergedGroupedPubInfos) {
      groupedPubInfoComplete[group] = addMissingYearsToPubInfo(
        mergedGroupedPubInfos[group],
        years[0]
      );
      groupedAuthorStats[group] = addMissingYearsToAuthorStats(
        getQualisStats(groupedPubInfoComplete[group], 'qualis', scores),
        groupedPubInfoComplete[group],
        years[0]
      );
    }
    console.log(
      'Dados de publicação de todos os grupos e autores (completos)',
      groupedPubInfoComplete
    );

    // Calcula o total de publicações em periódicos
    let totalPubs = 0;
    for (const key of Object.keys(allAuthorStats.stats)) {
      if (key !== 'year' && key !== 'jcr') {
        totalPubs += allAuthorStats.stats[key].reduce(
          (partialSum, a) => partialSum + a,
          0
        );
      }
    }
    allAuthorStats.totalPubs = totalPubs;
    for (const name in individualAuthorStats) {
      individualAuthorStats[name].totalPubs = totalPubs;
    }
    for (const group in groupedAuthorStats) {
      groupedAuthorStats[group].totalPubs = totalPubs;
    }

    const allStats = { __all: allAuthorStats.stats };

    const individualStats = {};
    for (const name in individualAuthorStats) {
      individualStats[name] = individualAuthorStats[name].stats;
    }

    const groupStats = {};
    for (const group in groupedAuthorStats) {
      groupStats[group] = groupedAuthorStats[group].stats;
    }

    console.log('Estatísticas de todos os autores integrados:', allStats);
    console.log(
      'Estatísticas de todos os autores individuais:',
      individualStats
    );
    console.log('Estatísticas de todos os grupos e autores:', groupStats);

    // Atualiza o estado com as informações obtidas
    setShowAll(true);
    setQualisFilter(['A', 'B']);
    setIsUnifiedChart(false);
    setStats(allStats);
    setIndividualStats(individualStats);
    setGroupStats(groupStats);
    setInitYearInput(years[0]);
    setEndYearInput(years[years.length - 1]);
    setInitYear(years[0]);
    setEndYear(years[years.length - 1]);
    setPubInfo(allPubInfoComplete);
    setIndividualPubInfo(individualPubInfoComplete);
    setGroupPubInfo(groupedPubInfoComplete);
  }

  if (previousArea?.area && !area) {
    setArea(previousArea.area);
    setAreaData(previousArea);
  }

  return (
    <>
      <Container fluid className="mt-3 mb-3" expand="md">
        <Form className="navbar-search navbar-search-dark form-inline mr-3 d-md-flex ml-lg-auto w-100">
          <FormGroup
            className="w-100"
            style={{ justifyContent: 'space-between' }}
          >
            {/* Select authors / groups */}
            <InputGroup
              className="input-group-alternative"
              style={{
                width: '500px',
                border: 'none',
                backgroundColor: 'white',
              }}
            >
              <InputGroupAddon addonType="prepend">
                <InputGroupText>
                  <i className="fas fa-user" style={{ color: '#415e98' }} />
                </InputGroupText>
              </InputGroupAddon>
              <Autocomplete
                onChange={handleCVsSelect}
                multiple
                options={cvOptions}
                getOptionLabel={(option) => option.name}
                groupBy={(option) => option.groupType}
                renderGroup={(params) => {
                  const { group, children, key } = params;
                  return (
                    <React.Fragment key={key}>
                      <ListSubheader
                        component="div"
                        sx={{
                          backgroundColor: "#fff",
                          fontWeight: "bold",
                          color: "#000",
                        }}
                      >
                        {group}
                      </ListSubheader>
                      
                      <Box sx={{ ml: 2 }}>
                        {children}
                      </Box>
                    </React.Fragment>
                  );
                }}
                defaultValue={[]}
                filterSelectedOptions
                renderInput={(params) => (
                  <TextField {...params} placeholder="Selecione um CV" />
                )}
                noOptionsText="Não há CVs disponíveis"
                sx={{
                  width: '90%',
                  '& .MuiButtonBase-root': {
                    color: '#415e98',
                  },
                  '& .MuiInputBase-input': {
                    color: '#415e98',
                  },
                  '& fieldset': {
                    border: 'none',
                  },
                  '& .MuiInputBase-root > .MuiButtonBase-root': {
                    border: '1px #415e98 solid',
                    backgroundColor: 'transparent',
                    '& .MuiSvgIcon-root': {
                      color: '#415e98',
                    },
                  },
                }}
              />
            </InputGroup>
            {/* Label */}
            {showAll && (
              <Label
                style={{
                  marginLeft: '10px',
                  marginRight: '10px',
                  color: '#415e98',
                }}
              >
                {Object.values(pubInfo).flat().length} artigos em periódicos
                entre {initYear} e {endYear}
              </Label>
            )}
          </FormGroup>
          {showAll && (
            <>
              <FormGroup className="w-100">
                {/* área do conhecimento */}
                <InputGroup
                  className="input-group-alternative mt-3"
                  style={{
                    marginRight: '15px',
                    border: 'none',
                    backgroundColor: 'white',
                  }}
                >
                  <InputGroupAddon addonType="prepend">
                    <InputGroupText>
                      <i
                        className="fas fa-graduation-cap"
                        style={{ color: '#415e98' }}
                      />
                    </InputGroupText>
                  </InputGroupAddon>
                  <Input
                    id="exampleSelect"
                    name="select"
                    type="select"
                    className="input-group-alternative"
                    style={{ marginRight: '15px', color: '#415e98' }}
                    value={area}
                    onChange={(e) => handleAreaChange(e)}
                    defaultValue={area}
                  >
                    <option value="" disabled={true} hidden={true}>
                      Selecione uma Área do Conhecimento
                    </option>
                    <option value="undefined" hidden={true}>
                      Sem Área do Conhecimento
                    </option>
                    {allQualisScores.map((greatArea) => (
                      <optgroup
                        label={greatArea.label}
                        style={{ color: 'black' }}
                      >
                        {Object.keys(greatArea.areas).map((a) => (
                          <option key={a} value={a}>
                            {greatArea.areas[a].label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Input>
                </InputGroup>
                {/* View type */}
                <InputGroup
                  className="input-group-alternative mt-3"
                  style={{
                    marginRight: '15px',
                    border: 'none',
                    backgroundColor: 'white',
                  }}
                >
                  <InputGroupAddon addonType="prepend">
                    <InputGroupText>
                      <i
                        className="fas fa-chart-bar"
                        style={{ color: '#415e98' }}
                      />
                    </InputGroupText>
                  </InputGroupAddon>
                  <Input
                    id="exampleSelect"
                    name="select"
                    type="select"
                    className="input-group-alternative"
                    style={{ marginRight: '15px', color: '#415e98' }}
                    value={viewType}
                    onChange={(e) => handleViewTypeChange(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled={true} hidden={true}>
                      {' '}
                      Selecione uma visualização
                    </option>
                    <optgroup label="Classificação" style={{ color: 'black' }}>
                      <option value="qualisTableView">
                        Tabela de classificação Qualis
                      </option>
                      <option value="qualisGraphicConsolidatedView">
                        Gráfico de classificação Qualis (consolidado)
                      </option>
                      <option value="qualisGraphicConsolidatedUnifiedView">
                        Gráfico de classificação Qualis (consolidado unificado)
                      </option>
                      <option value="qualisGraphicGroupView">
                        Gráfico de classificação Qualis (agrupado)
                      </option>
                      <option value="qualisGraphicGroupUnifiedView">
                        Gráfico de classificação Qualis (agrupado unificado)
                      </option>
                      <option value="qualisGraphicIndividualView">
                        Gráfico de classificação Qualis (individual)
                      </option>
                      <option value="qualisGraphicIndividualUnifiedView">
                        Gráfico de classificação Qualis (individual unificado)
                      </option>
                      <option value="qualisGraphicParetoCVView">
                        Gráfico de percentual de produção Qualis (por CV)
                      </option>
                    </optgroup>
                    <optgroup label="Pontuação" style={{ color: 'black' }}>
                      <option
                        disabled={!(areaData && areaData.scores)}
                        value="scoreTableView"
                      >
                        Tabela de pontuação Qualis
                      </option>
                      <option
                        disabled={!(areaData && areaData.scores)}
                        value="scoreGraphicView"
                      >
                        Gráfico de pontuação Qualis
                      </option>
                    </optgroup>
                    <optgroup label="Publicações" style={{ color: 'black' }}>
                      <option value="top5View">5 melhores artigos</option>
                      <option value="top10View">10 melhores artigos</option>
                    </optgroup>
                  </Input>
                </InputGroup>
                {/* Init year */}
                <InputGroup
                  className="input-group-alternative mt-3"
                  style={{
                    width: '100px',
                    border: 'none',
                    backgroundColor: 'white',
                  }}
                >
                  <Input
                    id="exampleEmail"
                    name="initYear"
                    placeholder="Ano de inicio"
                    type="number"
                    min={initYear}
                    max={endYearInput}
                    value={initYearInput}
                    required="required"
                    onChange={(e) => setInitYearInput(e.target.value)}
                    style={{ color: '#415e98' }}
                  />
                </InputGroup>
                <Label
                  className="mt-3"
                  style={{
                    marginLeft: '10px',
                    marginRight: '10px',
                    color: '#415e98',
                  }}
                >
                  a
                </Label>
                {/* End year */}
                <InputGroup
                  className="input-group-alternative mt-3"
                  style={{
                    width: '100px',
                    border: 'none',
                    backgroundColor: 'white',
                    marginRight: '10px',
                  }}
                >
                  <Input
                    style={{ color: '#415e98' }}
                    id="exampleEmail"
                    name="endYear"
                    placeholder="Ano de fim"
                    type="number"
                    min={initYearInput}
                    max={endYear}
                    value={endYearInput}
                    required="required"
                    onChange={(e) => setEndYearInput(e.target.value)}
                  />
                </InputGroup>
                {/* Period */}
                <InputGroup
                  className="input-group-alternative mt-3"
                  style={{ border: 'none', backgroundColor: 'white' }}
                >
                  <InputGroupAddon addonType="prepend">
                    <InputGroupText>
                      <i
                        className="fas fa-calendar-check"
                        style={{ color: '#415e98' }}
                      />
                    </InputGroupText>
                  </InputGroupAddon>
                  <Input
                    id="exampleSelect"
                    name="select"
                    type="select"
                    className="input-group-alternative"
                    style={{ marginRight: '15px', color: '#415e98' }}
                    onChange={(e) => handleSelectedPeriod(e.target.value)}
                    defaultValue="all"
                  >
                    <option value="last5" style={{ color: 'black' }}>
                      Últimos 5 anos
                    </option>
                    <option value="last10" style={{ color: 'black' }}>
                      Últimos 10 anos
                    </option>
                    <option value="all" style={{ color: 'black' }}>
                      {' '}
                      Todo o período do CV
                    </option>
                  </Input>
                </InputGroup>
                {/* Statistics */}
                <InputGroupText
                  className="mt-3 ml-4"
                  style={{ backgroundColor: 'transparent', border: 'none' }}
                >
                  <Input
                    addon
                    aria-label="Checkbox for following text input"
                    type="checkbox"
                    value={showStatistics}
                    onChange={(e) => setShowStatistics(!showStatistics)}
                  />
                  <Label style={{ color: '#415e98' }} className="ml-2">
                    Exibir estatísticas
                  </Label>
                </InputGroupText>
              </FormGroup>
            </>
          )}
        </Form>
      </Container>
      {/* Page content */}
      <Container className="mb-5" fluid>
        {showAll && (
          <>
            {viewType === 'qualisTableView' && (
              <DataTable
                tableName="Tabela de classificação Qualis"
                init={initYearInput}
                end={endYearInput}
                stats={stats}
                showStatistics={showStatistics}
              />
            )}
            {viewType === 'qualisGraphicConsolidatedView' && (
              <DataGraph
                graphName="Gráfico de classificação Qualis (consolidado)"
                init={initYearInput}
                end={endYearInput}
                stats={stats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
                // isUnifiedChart={false}
              />
            )}
            {viewType === 'qualisGraphicConsolidatedUnifiedView' && (
              <DataGraph
                graphName="Gráfico de classificação Qualis (consolidado unificado)"
                init={initYearInput}
                end={endYearInput}
                stats={stats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
                isUnifiedChart={true}
              />
            )}
            {viewType === 'qualisGraphicGroupView' && (
              <DataGraph
                graphName="Gráfico de classificação Qualis (agrupado)"
                init={initYearInput}
                end={endYearInput}
                stats={groupStats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
                // isUnifiedChart={false}
              />
            )}
            {viewType === 'qualisGraphicGroupUnifiedView' && (
              <DataGraph
                graphName="Gráfico de classificação Qualis (agrupado unificado)"
                init={initYearInput}
                end={endYearInput}
                stats={groupStats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
                isUnifiedChart={true}
              />
            )}
            {viewType === 'qualisGraphicIndividualView' && (
              <DataGraph
                graphName="Gráfico de classificação Qualis (individual)"
                init={initYearInput}
                end={endYearInput}
                stats={individualStats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
                // isUnifiedChart={false}
              />
            )}
            {viewType === 'qualisGraphicIndividualUnifiedView' && (
              <DataGraph
                graphName="Gráfico de classificação Qualis (individual unificado)"
                init={initYearInput}
                end={endYearInput}
                stats={individualStats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
                isUnifiedChart={true}
              />
            )}
            {viewType === 'qualisGraphicParetoCVView' && (
              <DataGraph
                graphName="Gráfico de percentual de produção Qualis (por CV)"
                init={initYearInput}
                end={endYearInput}
                stats={individualStats}
                qualisFilter={qualisFilter}
                showStatistics={showStatistics}
                isUnifiedChart={true}
                isParetoChart={true}
              />
            )}
            {viewType === 'scoreTableView' && (
              <DataTable
                tableName="Tabela de pontuação Qualis"
                init={initYearInput}
                end={endYearInput}
                stats={stats}
                showStatistics={showStatistics}
                areaData={areaData}
              />
            )}
            {viewType === 'scoreGraphicView' && (
              <DataGraph
                graphName="Gráfico de pontuação Qualis"
                init={initYearInput}
                end={endYearInput}
                stats={stats}
                statsFilter={qualisFilter}
                showStatistics={showStatistics}
                areaData={areaData}
              />
            )}
            {viewType === 'top5View' && (
              <TopTable
                tableName="5 melhores publicações"
                topN={5}
                init={initYearInput}
                end={endYearInput}
                pubInfo={pubInfo}
              />
            )}
            {viewType === 'top10View' && (
              <TopTable
                tableName="10 melhores publicações"
                topN={10}
                init={initYearInput}
                end={endYearInput}
                pubInfo={pubInfo}
              />
            )}
          </>
        )}
        {areaData?.scores && viewType.includes('score') && (
          <div className="mt-1">
            Fonte da pontuação:{' '}
            <a
              href={areaData.source.url}
              target="_blank"
              rel="noreferrer"
              title={`Visualizar ${areaData.source.label}`}
            >
              {areaData.source.label}
            </a>{' '}
            da {areaData.label} (ano-base: {areaData.base_year})
          </div>
        )}
      </Container>
    </>
  );
};

export default Index;
