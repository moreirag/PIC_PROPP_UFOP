import pandas as pd
import json
import os

def processar_dados(csv_path='dados-IC-propp.csv', excel_path='dados-IC-propp.xls', output_json='data/dados_ic_agrupados.json'):
    # Prioriza CSV se existir, senão usa Excel
    if os.path.exists(csv_path):
        print(f"Lendo base CSV: {csv_path}...")
        df = pd.read_csv(csv_path)
    elif os.path.exists(excel_path):
        print(f"Lendo base Excel: {excel_path}...")
        df = pd.read_excel(excel_path, sheet_name='Sheet2')
    else:
        print("Nenhum arquivo encontrado!")
        return

    def clean_prog(p):
        if not isinstance(p, str): return "OUTROS"
        s = p.strip().upper()
        if "FAPEMIG" in s and "INICIAÇÃO CIENTÍFICA" in s and "JR" not in s:
            return "PIBIC FAPEMIG"
        if "AÇÕES AFIRMATIVAS" in s:
            return "PIBIC-AF (CNPq)"
        if "DESENVOLVIMENTO TECNOLÓGICO" in s or "PIBITI" in s:
            return "PIBITI (CNPq/UFOP)"
        if "INSTITUCIONAL DE BOLSAS DE INICIAÇÃO CIENTÍFICA" in s and "JUNIOR" not in s and "CPRM" not in s:
            return "PIBIC (CNPq/UFOP)"
        if "INICIAÇÃO À PESQUISA" in s:
            return "PIP (UFOP)"
        if "VOLUNTÁRIOS DE INICIAÇÃO CIENTÍFICA" in s:
            return "PIVIC (Voluntário)"
        if "JUNIOR" in s or "JR." in s:
            return "ICJ / BIC-JR (Ensino Médio)"
        if "CPRM" in s:
            return "PIBIC CPRM/CNPq/UFOP"
        if "ENGENHARIA" in s:
            return "Especial Engenharia"
        return p.strip()

    df['PROGRAMA_CAT'] = df['PROGRAMA'].apply(clean_prog)
    
    group_cols = ['PROGRAMA_CAT', 'GRANDE ÁREA CNPQ', 'SETOR', 'SITUAÇÃO ATUAL']
    if 'ANO' in df.columns:
        group_cols.insert(0, 'ANO')
        
    agg = df.groupby(group_cols).size().reset_index(name='total')
    
    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(agg.to_dict(orient='records'), f, ensure_ascii=False, indent=2)
    print(f"Sucesso! Gerados {len(agg)} agrupamentos em {output_json}.")

if __name__ == '__main__':
    processar_dados()
