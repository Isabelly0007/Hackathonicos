"""CNPJ: validação dos dígitos verificadores (pendência P3), máscara e geração (conta Demo)."""

import re
import secrets


def _digito(base: str) -> str:
    pesos = list(range(len(base) - 7, 1, -1)) + list(range(9, 1, -1))
    resto = sum(int(d) * p for d, p in zip(base, pesos)) % 11
    return "0" if resto < 2 else str(11 - resto)


def validar_cnpj(valor: str) -> str:
    """Aceita com ou sem máscara; devolve só os 14 dígitos ou levanta ValueError."""
    digitos = re.sub(r"\D", "", valor or "")
    if len(digitos) != 14 or digitos == digitos[0] * 14:
        raise ValueError("CNPJ inválido")
    base = digitos[:12]
    dv1 = _digito(base)
    dv2 = _digito(base + dv1)
    if digitos[12:] != dv1 + dv2:
        raise ValueError("CNPJ inválido")
    return digitos


def gerar_cnpj() -> str:
    """CNPJ aleatório de matriz (filial 0001) com dígitos verificadores válidos."""
    while True:
        raiz = f"{secrets.randbelow(10**8):08d}"
        if raiz != raiz[0] * 8:
            break
    base = raiz + "0001"
    dv1 = _digito(base)
    return base + dv1 + _digito(base + dv1)


def formatar_cnpj(digitos: str) -> str:
    return f"{digitos[:2]}.{digitos[2:5]}.{digitos[5:8]}/{digitos[8:12]}-{digitos[12:]}"
