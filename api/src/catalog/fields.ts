/**
 * Wording of every field the catalog can require: the label shown in the form
 * and the question asked when the field comes back empty. It lives next to the
 * catalog because the wording of a field is catalog data, not classifier logic.
 */
export type FieldDefinition = {
  label: string;
  question: string;
};

export const FIELD_DEFINITIONS: Record<string, FieldDefinition> = {
  startDate: { label: "Início das férias", question: "Em que data as férias começam?" },
  daysCount: { label: "Quantidade de dias", question: "Quantos dias você quer tirar?" },
  dependentName: { label: "Nome do dependente", question: "Qual é o nome completo do dependente?" },
  relationship: { label: "Grau de parentesco", question: "Qual é o grau de parentesco com o dependente?" },
  dependentBirthDate: { label: "Data de nascimento", question: "Qual é a data de nascimento do dependente?" },
  referenceMonth: { label: "Mês de referência", question: "A qual mês de referência a divergência se refere?" },
  discrepancyType: { label: "Tipo de divergência", question: "Que tipo de divergência você identificou no holerite?" },
  systemName: { label: "Sistema", question: "Qual é o sistema em que você precisa de acesso?" },
  accessType: { label: "Tipo de acesso", question: "Você precisa de acesso novo, desbloqueio ou mais permissão?" },
  equipment: { label: "Equipamento", question: "Qual é o equipamento com defeito?" },
  location: { label: "Local", question: "Em qual local, andar ou sala isso acontece?" },
  needDescription: { label: "Descrição da necessidade", question: "Pode descrever com mais detalhe o que você precisa?" },
  issueType: { label: "Tipo de problema", question: "Qual é o tipo de problema encontrado?" },
  requestType: { label: "Tipo de solicitação", question: "Você precisa de segunda via, liberação ou autorização de visitante?" },
  site: { label: "Unidade", question: "Em qual unidade ou prédio?" },
};

/** Falls back to the raw key, so a field without wording still renders and fails loudly in review. */
export function getFieldDefinition(field: string): FieldDefinition {
  return FIELD_DEFINITIONS[field] ?? { label: field, question: `Pode informar o valor de ${field}?` };
}
