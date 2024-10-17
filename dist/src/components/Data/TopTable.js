
import {
  Card,
  CardHeader,
  Table,
  Row,
  Col,
} from "reactstrap";

const TopTable = ({
  tableName,
  init,
  end,
  pubInfo,
  topN
}) => {
  init = Number(init);
  end = Number(end);
  
  // Create header from data arrays
  const header = ["#", "Ano", "Título", "Periódico", "ISSN", "Qualis", "Ano-base"];

  let topPubs = [];

  // build publication array from PubInfo
  for (const year of Object.keys(pubInfo)) {
    // select PubInfo elements within given start and end years
    if (year >= init && year <= end) {
      // process publication elements of current year
      for (const pubItem of pubInfo[year]) {
        // create publication entry
        const pubEntry = {
          year: year,
          title: pubItem.title,
          pubName: pubItem.pubName,
          issn: pubItem.issn,
          qualis: pubItem.qualis,
          baseYear: pubItem.baseYear,
        };

        // insert publication entry into publication array
        topPubs.push(pubEntry);
      }
    }
  }

  // Função para ordenar um array de objetos por várias chaves de forma reversa
  function sortByKeysReverse(arr, keys) {
    const sortedArray = [...arr];
    keys.reverse().forEach((key) => {
      sortedArray.sort((a, b) => {
        if (a[key] < b[key]) return 1;
        if (a[key] > b[key]) return -1;
        return 0;
      });
    });
    return sortedArray;
  }

  // Função para ordenar um array de objetos por várias chaves (não reverso)
  function sortByKeys(arr, keys) {
    const sortedArray = [...arr];
    keys.forEach((key) => {
      sortedArray.sort((a, b) => {
        if (a[key] < b[key]) return -1;
        if (a[key] > b[key]) return 1;
        return 0;
      });
    });
    return sortedArray;
  }


  
  // return top N publications from sorted publication array sorted by Qualis classification
  // Ordena as publicações por ano de forma reversa e depois por qualis
  topPubs = sortByKeysReverse(topPubs, ['year']);
  topPubs = sortByKeys(topPubs, ['qualis']);
  topPubs = topPubs.slice(0, topN);


  return (
    <Row>
      <Col className="mb-5 mb-xl-0" xl="10">
        <Card className="shadow">
          <CardHeader className="border-0">
            <Row className="align-items-center">
              <div className="col">
                <h3 className="mb-0">{tableName}</h3>
              </div>
            </Row>
          </CardHeader>
          <Table className="align-items-center table-flush" responsive>
            <thead className="thead-light">
              <tr>
                {header.map(item => <th scope="col">{item}</th>)}
              </tr>
            </thead>
            <tbody>
              {topPubs.map((topPub, index) => <tr>
                <td>{index+1}</td>
                <td>{topPub.year}</td>
                <td style={{
                  whiteSpace: 'break-spaces'
                }}>{topPub.title}</td>
                <td style={{
                  whiteSpace: 'break-spaces'
                }}>{topPub.pubName}</td>
                <td>{topPub.issn}</td>
                <td>{topPub.qualis}</td>
                <td>{topPub.baseYear}</td>
              </tr>)}
            </tbody>
          </Table>
        </Card>
      </Col>
    </Row>
  );
};

export default TopTable;
